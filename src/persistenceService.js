// =============================================================================
// Persistence Service - Per-Workspace Storage & Firestore Subcollection API
// =============================================================================
// This module implements:
// - Per-workspace localStorage schema (replaces monolithic nexus-app-state blob)
// - Migration logic from old blob format to new per-workspace keys
// - Firestore subcollection-based read/write functions
// - Debounced save helpers for App.jsx integration
// =============================================================================
//
// MIGRATION LIFECYCLE
// -------------------
// The migration from the monolithic nexus-app-state blob to per-workspace keys
// follows this lifecycle:
//
// 1. DETECTION: On app init, detectMigrationNeeded() checks for the presence of
//    the legacy nexus-app-state key and the absence of cm-migration-status with
//    status "completed". If migration is needed, it returns { needed: true }.
//
// 2. EXECUTION: migrateFromBlobToPerWorkspace() reads the old blob, splits it
//    into per-workspace localStorage keys (cm-meta, cm-proj-*, cm-ws-*, cm-tasks-*),
//    and writes them. The original nexus-app-state key is preserved (not deleted)
//    to allow rollback.
//
// 3. VERIFICATION: After migration, the app loads via the new cm-* keys. If the
//    load succeeds and the user continues normal operation, the migration is
//    considered verified.
//
// 4. COMPLETION: The cm-migration-status key records { status: "completed",
//    migratedAt: timestamp }. Once completed, the migration path is skipped on
//    subsequent loads.
//
// ROLLBACK WINDOW: The nexus-app-state blob is retained for 7 days after
// migration completes. During this window, rollbackMigration() can clear all
// cm-* keys and reset cm-migration-status, allowing the app to fall back to
// the original blob on the next load. After 7 days, the blob may be cleaned up
// by a future maintenance pass.
//
// =============================================================================

import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

// =============================================================================
// CONSTANTS - localStorage key patterns
// =============================================================================

/** Meta key storing activeProjectId, defaultProjectId, schemaVersion */
const KEY_META = 'cm-meta';

/** Project metadata key pattern: cm-proj-{projectId} */
const KEY_PROJECT_PREFIX = 'cm-proj-';

/** Workspace data key pattern: cm-ws-{projectId}-{workspaceId} */
const KEY_WORKSPACE_PREFIX = 'cm-ws-';

/** Tasks key pattern: cm-tasks-{projectId} */
const KEY_TASKS_PREFIX = 'cm-tasks-';

/** Migration status key */
const KEY_MIGRATION_STATUS = 'cm-migration-status';

/** Schema version for the new per-workspace format */
const SCHEMA_VERSION = 2;

/** Legacy key for the old monolithic blob */
const LEGACY_KEY = 'nexus-app-state';

/** Legacy key for active project */
const LEGACY_ACTIVE_KEY = 'nexus-active-project';

/** Legacy key for default project */
const LEGACY_DEFAULT_KEY = 'nexus-default-project';

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generate a unique ID using crypto.randomUUID() with fallback.
 * Replaces Date.now()-based IDs for new entities going forward.
 * Existing IDs are preserved during migration - this is only for new creations.
 * @returns {string} A UUID-like string
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers that lack crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// MIGRATION DETECTION
// =============================================================================

/**
 * Detect whether migration from the old blob format is needed.
 * Checks if nexus-app-state exists and cm-migration-status is not 'completed'.
 * @returns {{ needed: boolean, reason: string }}
 */
export function detectMigrationNeeded() {
  const hasLegacyData = localStorage.getItem(LEGACY_KEY) !== null;
  const migrationStatus = localStorage.getItem(KEY_MIGRATION_STATUS);

  if (!hasLegacyData) {
    return { needed: false, reason: 'No legacy nexus-app-state data found' };
  }

  if (migrationStatus) {
    try {
      const status = JSON.parse(migrationStatus);
      if (status.status === 'completed') {
        return { needed: false, reason: 'Migration already completed' };
      }
      return { needed: true, reason: `Migration status is "${status.status}" - needs retry` };
    } catch {
      return { needed: true, reason: 'Migration status is corrupt - needs retry' };
    }
  }

  return { needed: true, reason: 'Legacy data exists but no migration has been performed' };
}

// =============================================================================
// MIGRATION EXECUTION
// =============================================================================

/**
 * Migrate from the monolithic nexus-app-state blob to per-workspace localStorage keys.
 * 
 * This function is idempotent - if interrupted, detectMigrationNeeded() will return true
 * and the next load will retry the migration.
 * 
 * Does NOT delete nexus-app-state (kept for 7-day rollback window).
 * 
 * localStorage size validation: logs a warning if total estimated size exceeds 4MB.
 * 
 * @returns {{ success: boolean, projectCount: number, workspaceCount: number, errors: string[] }}
 */
export function migrateFromBlobToPerWorkspace() {
  const errors = [];
  let projectCount = 0;
  let workspaceCount = 0;
  const startedAt = Date.now();

  try {
    // Read legacy blob
    const rawBlob = localStorage.getItem(LEGACY_KEY);
    if (!rawBlob) {
      return { success: false, projectCount: 0, workspaceCount: 0, errors: ['nexus-app-state not found'] };
    }

    let parsed;
    try {
      parsed = JSON.parse(rawBlob);
    } catch (e) {
      return { success: false, projectCount: 0, workspaceCount: 0, errors: ['Failed to parse nexus-app-state: ' + e.message] };
    }

    const projects = Array.isArray(parsed) ? parsed : (parsed.projects || []);

    // Set migration status to in-progress
    try {
      localStorage.setItem(KEY_MIGRATION_STATUS, JSON.stringify({
        status: 'in-progress',
        startedAt
      }));
    } catch (quotaErr) {
      // Cannot even write status - abort immediately
      return { success: false, projectCount: 0, workspaceCount: 0, errors: ['QuotaExceededError: Cannot write migration status - localStorage is full'] };
    }

    // Helper to safely write to localStorage, aborting on quota errors
    function safeSetItem(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
          throw e; // Re-throw quota errors to abort migration
        }
        throw e; // Re-throw other errors too
      }
    }

    // Migrate each project
    for (const project of projects) {
      try {
        const projectId = project.id;
        if (!projectId) {
          errors.push('Skipped project with no id');
          continue;
        }

        const workspaces = project.workspaces || [];
        const workspaceIds = workspaces.map(ws => ws.id);

        // Write project metadata
        const projectMeta = {
          id: projectId,
          name: project.name || 'Untitled',
          description: project.description || '',
          password: project.password || null,
          thumbnail: project.thumbnail || null,
          lastModified: project.lastModified || Date.now(),
          activeTab: project.activeTab || 0,
          nextId: project.nextId || 1,
          reminders: project.reminders || [],
          workspaceIds,
          schemaVersion: SCHEMA_VERSION
        };
        safeSetItem(KEY_PROJECT_PREFIX + projectId, JSON.stringify(projectMeta));
        projectCount++;

        // Write each workspace
        for (const ws of workspaces) {
          try {
            const wsId = ws.id;
            if (!wsId) {
              errors.push(`Skipped workspace with no id in project ${projectId}`);
              continue;
            }

            const wsData = {
              id: wsId,
              name: ws.name || 'Workspace',
              nodes: ws.nodes || [],
              edges: ws.edges || [],
              groups: ws.groups || [],
              pins: ws.pins || [],
              images: ws.images || [],
              lastModified: ws.lastModified || Date.now()
            };
            safeSetItem(KEY_WORKSPACE_PREFIX + projectId + '-' + wsId, JSON.stringify(wsData));
            workspaceCount++;
          } catch (wsErr) {
            if (wsErr.name === 'QuotaExceededError' || wsErr.code === 22 || wsErr.code === 1014) {
              throw wsErr; // Propagate quota errors to abort
            }
            errors.push(`Failed to write workspace ${ws.id} in project ${projectId}: ${wsErr.message}`);
          }
        }

        // Write tasks for this project
        try {
          const tasksData = {
            tasks: project.tasks || [],
            taskGroups: project.taskGroups || []
          };
          safeSetItem(KEY_TASKS_PREFIX + projectId, JSON.stringify(tasksData));
        } catch (taskErr) {
          if (taskErr.name === 'QuotaExceededError' || taskErr.code === 22 || taskErr.code === 1014) {
            throw taskErr; // Propagate quota errors to abort
          }
          errors.push(`Failed to write tasks for project ${projectId}: ${taskErr.message}`);
        }
      } catch (projErr) {
        if (projErr.name === 'QuotaExceededError' || projErr.code === 22 || projErr.code === 1014) {
          // Quota exceeded - abort migration and reset status to failed
          try {
            localStorage.setItem(KEY_MIGRATION_STATUS, JSON.stringify({
              status: 'failed',
              startedAt,
              failedAt: Date.now(),
              reason: 'QuotaExceededError'
            }));
          } catch { /* Cannot even write status - nothing more we can do */ }
          errors.push(`Migration aborted: localStorage quota exceeded while writing project ${project.id || 'unknown'}`);
          return { success: false, projectCount, workspaceCount, errors };
        }
        errors.push(`Failed to migrate project ${project.id || 'unknown'}: ${projErr.message}`);
      }
    }

    // Write meta
    const activeProjectId = localStorage.getItem(LEGACY_ACTIVE_KEY) || (projects[0] && projects[0].id) || null;
    const defaultProjectId = localStorage.getItem(LEGACY_DEFAULT_KEY) || activeProjectId;

    try {
      safeSetItem(KEY_META, JSON.stringify({
        activeProjectId,
        defaultProjectId,
        schemaVersion: SCHEMA_VERSION
      }));

      // Mark migration complete
      safeSetItem(KEY_MIGRATION_STATUS, JSON.stringify({
        status: 'completed',
        startedAt,
        completedAt: Date.now()
      }));
    } catch (quotaErr) {
      // Quota exceeded writing meta/status - mark failed
      try {
        localStorage.setItem(KEY_MIGRATION_STATUS, JSON.stringify({
          status: 'failed',
          startedAt,
          failedAt: Date.now(),
          reason: 'QuotaExceededError during finalization'
        }));
      } catch { /* Cannot write status */ }
      errors.push('Migration aborted: localStorage quota exceeded while writing meta/status');
      return { success: false, projectCount, workspaceCount, errors };
    }

    // localStorage size validation - warn if exceeding 4MB
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cm-')) {
        totalSize += (localStorage.getItem(key) || '').length;
      }
    }
    if (totalSize > 4 * 1024 * 1024) {
      console.warn(`[PersistenceService] localStorage usage for cm-* keys exceeds 4MB (${(totalSize / 1024 / 1024).toFixed(2)}MB). Consider pruning old data.`);
    }

    return { success: true, projectCount, workspaceCount, errors };
  } catch (err) {
    errors.push('Migration failed with unexpected error: ' + err.message);
    return { success: false, projectCount, workspaceCount, errors };
  }
}

// =============================================================================
// ROLLBACK
// =============================================================================

/**
 * Rollback migration by clearing all cm-* keys and resetting cm-migration-status.
 * The app will fall back to nexus-app-state on next load.
 */
export function rollbackMigration() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cm-')) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

// =============================================================================
// LOCALSTORAGE READ/WRITE API
// =============================================================================

/**
 * Load the meta object (activeProjectId, defaultProjectId, schemaVersion).
 * @returns {object|null}
 */
export function loadMeta() {
  try {
    const raw = localStorage.getItem(KEY_META);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Save the meta object.
 * @param {object} meta - { activeProjectId, defaultProjectId, schemaVersion }
 */
export function saveMeta(meta) {
  localStorage.setItem(KEY_META, JSON.stringify(meta));
}

/**
 * Load project metadata for a given project.
 * @param {string} projectId
 * @returns {object|null}
 */
export function loadProjectMeta(projectId) {
  try {
    const raw = localStorage.getItem(KEY_PROJECT_PREFIX + projectId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Save project metadata.
 * @param {string} projectId
 * @param {object} data
 */
export function saveProjectMeta(projectId, data) {
  localStorage.setItem(KEY_PROJECT_PREFIX + projectId, JSON.stringify(data));
}

/**
 * Load workspace data for a specific project and workspace.
 * @param {string} projectId
 * @param {string} workspaceId
 * @returns {object|null}
 */
export function loadWorkspace(projectId, workspaceId) {
  try {
    const raw = localStorage.getItem(KEY_WORKSPACE_PREFIX + projectId + '-' + workspaceId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Save workspace data.
 * @param {string} projectId
 * @param {string} workspaceId
 * @param {object} data - { name, nodes, edges, groups, pins, images, lastModified }
 */
export function saveWorkspace(projectId, workspaceId, data) {
  localStorage.setItem(KEY_WORKSPACE_PREFIX + projectId + '-' + workspaceId, JSON.stringify(data));
}

/**
 * Remove a workspace key from localStorage.
 * @param {string} projectId
 * @param {string} workspaceId
 */
export function removeWorkspaceLocal(projectId, workspaceId) {
  localStorage.removeItem(KEY_WORKSPACE_PREFIX + projectId + '-' + workspaceId);
}

/**
 * Load tasks and taskGroups for a project.
 * @param {string} projectId
 * @returns {object|null} - { tasks, taskGroups }
 */
export function loadTasks(projectId) {
  try {
    const raw = localStorage.getItem(KEY_TASKS_PREFIX + projectId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Save tasks and taskGroups for a project.
 * @param {string} projectId
 * @param {object} data - { tasks, taskGroups }
 */
export function saveTasks(projectId, data) {
  localStorage.setItem(KEY_TASKS_PREFIX + projectId, JSON.stringify(data));
}

/**
 * Scan localStorage for all project IDs by looking for cm-proj-* keys.
 * @returns {string[]} Array of project IDs
 */
export function loadAllProjectIds() {
  const ids = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEY_PROJECT_PREFIX)) {
      ids.push(key.slice(KEY_PROJECT_PREFIX.length));
    }
  }
  return ids;
}

// =============================================================================
// FIRESTORE SUBCOLLECTION API
// =============================================================================
//
// Firestore structure:
//   projects/{projectId}               -> project metadata document
//   projects/{projectId}/workspaces/{workspaceId} -> workspace data
//   projects/{projectId}/tasks/taskData -> tasks + taskGroups
//   userMeta/main                       -> activeProjectId, defaultProjectId
//
// --- Firebase Cost Documentation ---
// @cost Startup: 1 userMeta read + 1 project read + N workspace reads
//       (where N = workspaceIds.length) + 1 tasks read
// @cost Project switch: 1 project read + N workspace reads + 1 tasks read
// @cost Workspace switch: 0 reads (already loaded in memory)
// @cost Autosave workspace: 1 write
// @cost Autosave tasks: 1 write
// @cost Autosave metadata: 1 write
// =============================================================================

// Write-race guard for Firestore writes - per-path queuing to avoid dropping
// concurrent saves to different documents. Each document path gets its own
// in-flight/queued slot, so a workspace save cannot discard a metadata save.
const firestoreWriteQueues = new Map(); // Map<string, { inFlight: boolean, queued: Function|null }>

async function guardedFirestoreSave(path, saveFn) {
  if (!firestoreWriteQueues.has(path)) {
    firestoreWriteQueues.set(path, { inFlight: false, queued: null });
  }
  const slot = firestoreWriteQueues.get(path);

  if (slot.inFlight) {
    slot.queued = saveFn;
    return true;
  }

  slot.inFlight = true;
  try {
    const result = await saveFn();
    return result;
  } finally {
    slot.inFlight = false;
    if (slot.queued) {
      const nextSave = slot.queued;
      slot.queued = null;
      guardedFirestoreSave(path, nextSave).catch(() => {});
    }
  }
}

/**
 * Save project metadata to Firestore.
 * Excludes the `password` field from the Firestore payload to avoid storing
 * credential hashes in a document accessible to any authenticated user.
 * @param {string} projectId
 * @param {object} metadata - project metadata
 * @returns {Promise<boolean>}
 */
export async function saveProjectToFirestore(projectId, metadata) {
  if (!isFirebaseConfigured() || !db) return false;
  return guardedFirestoreSave(`projects/${projectId}`, async () => {
    try {
      // Strip password from the Firestore payload - credentials stay local only
      const { password, ...safeMetadata } = metadata;
      const docRef = doc(db, 'projects', projectId);
      await setDoc(docRef, safeMetadata, { merge: true });
      return true;
    } catch (error) {
      console.warn('[PersistenceService] Error saving project to Firestore:', error.message);
      return false;
    }
  });
}

/**
 * Load project metadata from Firestore.
 * @param {string} projectId
 * @returns {Promise<object|null>}
 */
export async function loadProjectFromFirestore(projectId) {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.warn('[PersistenceService] Error loading project from Firestore:', error.message);
    return null;
  }
}

/**
 * Save workspace data to Firestore subcollection.
 * @param {string} projectId
 * @param {string} workspaceId
 * @param {object} data - workspace data
 * @returns {Promise<boolean>}
 */
export async function saveWorkspaceToFirestore(projectId, workspaceId, data) {
  if (!isFirebaseConfigured() || !db) return false;
  return guardedFirestoreSave(`projects/${projectId}/workspaces/${workspaceId}`, async () => {
    try {
      const docRef = doc(db, 'projects', projectId, 'workspaces', workspaceId);
      await setDoc(docRef, data, { merge: true });
      return true;
    } catch (error) {
      console.warn('[PersistenceService] Error saving workspace to Firestore:', error.message);
      return false;
    }
  });
}

/**
 * Delete a workspace document from Firestore subcollection.
 * @param {string} projectId
 * @param {string} workspaceId
 * @returns {Promise<boolean>}
 */
export async function deleteWorkspaceFromFirestore(projectId, workspaceId) {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    const docRef = doc(db, 'projects', projectId, 'workspaces', workspaceId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn('[PersistenceService] Error deleting workspace from Firestore:', error.message);
    return false;
  }
}

/**
 * Delete an entire project from Firestore, including its workspace and task
 * subcollection documents and the project document itself.
 * @param {string} projectId
 * @param {string[]} workspaceIds - IDs of workspaces to delete from subcollection
 * @returns {Promise<boolean>}
 */
export async function deleteProjectFromFirestore(projectId, workspaceIds = []) {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    // Delete all workspace subcollection documents
    for (const wsId of workspaceIds) {
      const wsRef = doc(db, 'projects', projectId, 'workspaces', wsId);
      await deleteDoc(wsRef);
    }
    // Delete the tasks subcollection document
    const tasksRef = doc(db, 'projects', projectId, 'tasks', 'taskData');
    await deleteDoc(tasksRef);
    // Delete the project document itself
    const projRef = doc(db, 'projects', projectId);
    await deleteDoc(projRef);
    return true;
  } catch (error) {
    console.warn('[PersistenceService] Error deleting project from Firestore:', error.message);
    return false;
  }
}

/**
 * Load a single workspace from Firestore subcollection.
 * @param {string} projectId
 * @param {string} workspaceId
 * @returns {Promise<object|null>}
 */
export async function loadWorkspaceFromFirestore(projectId, workspaceId) {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, 'projects', projectId, 'workspaces', workspaceId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.warn('[PersistenceService] Error loading workspace from Firestore:', error.message);
    return null;
  }
}

/**
 * Load all workspaces for a project from Firestore subcollection.
 * @param {string} projectId
 * @returns {Promise<Map<string, object>|null>} Map of workspaceId -> data
 */
export async function loadAllWorkspacesFromFirestore(projectId) {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const collRef = collection(db, 'projects', projectId, 'workspaces');
    const snapshot = await getDocs(collRef);
    const workspaces = new Map();
    snapshot.forEach((docSnap) => {
      workspaces.set(docSnap.id, docSnap.data());
    });
    return workspaces;
  } catch (error) {
    console.warn('[PersistenceService] Error loading all workspaces from Firestore:', error.message);
    return null;
  }
}

/**
 * Save tasks data to Firestore subcollection.
 * Path: projects/{projectId}/tasks/taskData
 * @param {string} projectId
 * @param {object} data - { tasks, taskGroups }
 * @returns {Promise<boolean>}
 */
export async function saveTasksToFirestore(projectId, data) {
  if (!isFirebaseConfigured() || !db) return false;
  return guardedFirestoreSave(`projects/${projectId}/tasks/taskData`, async () => {
    try {
      const docRef = doc(db, 'projects', projectId, 'tasks', 'taskData');
      await setDoc(docRef, data, { merge: true });
      return true;
    } catch (error) {
      console.warn('[PersistenceService] Error saving tasks to Firestore:', error.message);
      return false;
    }
  });
}

/**
 * Load tasks data from Firestore subcollection.
 * Path: projects/{projectId}/tasks/taskData
 * @param {string} projectId
 * @returns {Promise<object|null>} - { tasks, taskGroups }
 */
export async function loadTasksFromFirestore(projectId) {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, 'projects', projectId, 'tasks', 'taskData');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.warn('[PersistenceService] Error loading tasks from Firestore:', error.message);
    return null;
  }
}

/**
 * Save user meta to Firestore.
 * Path: userMeta/main
 * @param {object} meta - { activeProjectId, defaultProjectId }
 * @returns {Promise<boolean>}
 */
export async function saveUserMeta(meta) {
  if (!isFirebaseConfigured() || !db) return false;
  return guardedFirestoreSave('userMeta/main', async () => {
    try {
      const docRef = doc(db, 'userMeta', 'main');
      await setDoc(docRef, meta, { merge: true });
      return true;
    } catch (error) {
      console.warn('[PersistenceService] Error saving userMeta to Firestore:', error.message);
      return false;
    }
  });
}

/**
 * Load user meta from Firestore.
 * Path: userMeta/main
 * @returns {Promise<object|null>} - { activeProjectId, defaultProjectId }
 */
export async function loadUserMeta() {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, 'userMeta', 'main');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.warn('[PersistenceService] Error loading userMeta from Firestore:', error.message);
    return null;
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the persistence layer. Orchestrates the full load sequence:
 * 1. Check migration status; run migration if needed
 * 2. Try loading from Firestore (userMeta -> project -> workspaces -> tasks)
 * 3. Fall back to localStorage cm-* keys if Firestore fails/unavailable
 * 4. Fall back to nexus-app-state blob as final fallback (backward compat)
 * 
 * Memory strategy: Only the active project's workspaces are loaded into memory.
 * NOTE: For projects with 50+ workspaces, consider implementing LRU eviction
 * in a future iteration.
 * 
 * @returns {Promise<{
 *   projects: Map<string, object>,
 *   activeWorkspaces: Map<string, object>,
 *   tasks: Array,
 *   taskGroups: Array,
 *   activeProjectId: string|null,
 *   defaultProjectId: string|null,
 *   source: 'firestore'|'localStorage'|'legacy'
 * }>}
 */
export async function initializePersistence() {
  // Step 1: Check and run migration if needed
  const migrationCheck = detectMigrationNeeded();
  if (migrationCheck.needed) {
    const result = migrateFromBlobToPerWorkspace();
    if (!result.success) {
      console.warn('[PersistenceService] Migration had issues:', result.errors);
    }
  }

  // Step 2: Try Firestore first
  try {
    const userMeta = await loadUserMeta();
    if (userMeta && userMeta.activeProjectId) {
      const activeProjectId = userMeta.activeProjectId;
      const defaultProjectId = userMeta.defaultProjectId || activeProjectId;

      const projectMeta = await loadProjectFromFirestore(activeProjectId);
      if (projectMeta) {
        // Load all workspaces for the active project
        const workspaceIds = projectMeta.workspaceIds || [];
        const activeWorkspaces = new Map();
        for (const wsId of workspaceIds) {
          const wsData = await loadWorkspaceFromFirestore(activeProjectId, wsId);
          if (wsData) {
            activeWorkspaces.set(wsId, wsData);
          }
        }

        // Load tasks
        const tasksData = await loadTasksFromFirestore(activeProjectId);
        const tasks = tasksData ? (tasksData.tasks || []) : [];
        const taskGroups = tasksData ? (tasksData.taskGroups || []) : [];

        // Build projects map (at minimum includes active project)
        const projects = new Map();
        projects.set(activeProjectId, projectMeta);

        return {
          projects,
          activeWorkspaces,
          tasks,
          taskGroups,
          activeProjectId,
          defaultProjectId,
          source: 'firestore'
        };
      }
    }
  } catch (firestoreErr) {
    console.warn('[PersistenceService] Firestore load failed, falling back to localStorage:', firestoreErr.message);
  }

  // Step 3: Fall back to localStorage cm-* keys
  const meta = loadMeta();
  if (meta && meta.activeProjectId) {
    const activeProjectId = meta.activeProjectId;
    const defaultProjectId = meta.defaultProjectId || activeProjectId;

    // Load all project IDs and their metadata
    const projectIds = loadAllProjectIds();
    const projects = new Map();
    for (const pid of projectIds) {
      const pmeta = loadProjectMeta(pid);
      if (pmeta) {
        projects.set(pid, pmeta);
      }
    }

    // Load workspaces for the active project
    const activeProjectMeta = projects.get(activeProjectId);
    const activeWorkspaces = new Map();
    if (activeProjectMeta && activeProjectMeta.workspaceIds) {
      for (const wsId of activeProjectMeta.workspaceIds) {
        const wsData = loadWorkspace(activeProjectId, wsId);
        if (wsData) {
          activeWorkspaces.set(wsId, wsData);
        }
      }
    }

    // Load tasks
    const tasksData = loadTasks(activeProjectId);
    const tasks = tasksData ? (tasksData.tasks || []) : [];
    const taskGroups = tasksData ? (tasksData.taskGroups || []) : [];

    return {
      projects,
      activeWorkspaces,
      tasks,
      taskGroups,
      activeProjectId,
      defaultProjectId,
      source: 'localStorage'
    };
  }

  // Step 4: Fall back to legacy nexus-app-state blob
  try {
    const rawBlob = localStorage.getItem(LEGACY_KEY);
    if (rawBlob) {
      const parsed = JSON.parse(rawBlob);
      const projectsArray = Array.isArray(parsed) ? parsed : (parsed.projects || []);
      const projects = new Map();
      for (const proj of projectsArray) {
        if (proj.id) {
          projects.set(proj.id, proj);
        }
      }

      const activeProjectId = localStorage.getItem(LEGACY_ACTIVE_KEY) || (projectsArray[0] && projectsArray[0].id) || null;
      const defaultProjectId = localStorage.getItem(LEGACY_DEFAULT_KEY) || activeProjectId;

      // Load workspaces from the active project in the blob
      const activeWorkspaces = new Map();
      const activeProject = projectsArray.find(p => p.id === activeProjectId);
      if (activeProject && activeProject.workspaces) {
        for (const ws of activeProject.workspaces) {
          if (ws.id) {
            activeWorkspaces.set(ws.id, ws);
          }
        }
      }

      const tasks = activeProject ? (activeProject.tasks || []) : [];
      const taskGroups = activeProject ? (activeProject.taskGroups || []) : [];

      return {
        projects,
        activeWorkspaces,
        tasks,
        taskGroups,
        activeProjectId,
        defaultProjectId,
        source: 'legacy'
      };
    }
  } catch (legacyErr) {
    console.warn('[PersistenceService] Legacy load failed:', legacyErr.message);
  }

  // Nothing found - return empty state
  return {
    projects: new Map(),
    activeWorkspaces: new Map(),
    tasks: [],
    taskGroups: [],
    activeProjectId: null,
    defaultProjectId: null,
    source: 'localStorage'
  };
}

// =============================================================================
// DEBOUNCED SAVE HELPERS
// =============================================================================

/**
 * Factory that creates a debounced save function.
 * Used by App.jsx to create independent debounce timers:
 * - workspace saves (300ms)
 * - task saves (500ms)
 * - metadata saves (200ms)
 * 
 * Uses clearTimeout/setTimeout pattern similar to the existing saveTimerRef logic.
 * 
 * @param {number} delayMs - Debounce delay in milliseconds
 * @returns {function} A function that accepts a save callback and debounces its execution
 */
export function createDebouncedSaver(delayMs) {
  let timerId = null;

  /**
   * Schedule a save callback to run after the debounce delay.
   * If called again before the delay elapses, the previous pending save is cancelled
   * and only the latest callback will execute.
   * @param {function} saveCallback - The async save function to debounce
   */
  function debouncedSave(saveCallback) {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = null;
      if (typeof saveCallback === 'function') {
        saveCallback();
      }
    }, delayMs);
  }

  // Attach a cancel method for cleanup
  debouncedSave.cancel = function () {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debouncedSave;
}

// =============================================================================
// LEGACY FIRESTORE API (deprecated - backward compat only)
// =============================================================================
// These functions read/write from the old single-document Firestore format
// (collection: "appData", document: "main") used before the subcollection
// migration. They exist solely to support the initialization fallback path
// that loads existing user data stored in the old schema. New code should use
// the subcollection API above (saveProjectToFirestore, loadProjectFromFirestore,
// saveWorkspaceToFirestore, etc.).
//
// These will be removed once all users have migrated to the subcollection format.
// =============================================================================

const LEGACY_FIRESTORE_COLLECTION = 'appData';
const LEGACY_FIRESTORE_DOC_ID = 'main';

/**
 * @deprecated Use loadProjectFromFirestore / loadAllWorkspacesFromFirestore instead.
 * Load the full projects array from the legacy single-document Firestore format.
 * @returns {Promise<Array|null>}
 */
export async function loadLegacyProjects() {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, LEGACY_FIRESTORE_COLLECTION, LEGACY_FIRESTORE_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.projects) {
        return JSON.parse(data.projects);
      }
    }
    return null;
  } catch (error) {
    console.warn('[PersistenceService] Error loading legacy projects:', error.message);
    return null;
  }
}

/**
 * @deprecated Use loadUserMeta instead.
 * Load the active project ID from the legacy single-document Firestore format.
 * @returns {Promise<string|null>}
 */
export async function loadLegacyActiveProject() {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, LEGACY_FIRESTORE_COLLECTION, LEGACY_FIRESTORE_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().activeProjectId || null;
    }
    return null;
  } catch (error) {
    console.warn('[PersistenceService] Error loading legacy active project:', error.message);
    return null;
  }
}

/**
 * @deprecated Use loadUserMeta instead.
 * Load the default project ID from the legacy single-document Firestore format.
 * @returns {Promise<string|null>}
 */
export async function loadLegacyDefaultProject() {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, LEGACY_FIRESTORE_COLLECTION, LEGACY_FIRESTORE_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().defaultProjectId || null;
    }
    return null;
  } catch (error) {
    console.warn('[PersistenceService] Error loading legacy default project:', error.message);
    return null;
  }
}

/**
 * @deprecated Use saveProjectToFirestore / saveWorkspaceToFirestore instead.
 * Save the full projects array to the legacy single-document Firestore format.
 * Used only during initialization when local data is newer and needs to sync up.
 * @param {Array} projects
 * @returns {Promise<boolean>}
 */
export async function saveLegacyProjects(projects) {
  if (!isFirebaseConfigured() || !db) return false;
  return guardedFirestoreSave(`${LEGACY_FIRESTORE_COLLECTION}/${LEGACY_FIRESTORE_DOC_ID}`, async () => {
    try {
      const docRef = doc(db, LEGACY_FIRESTORE_COLLECTION, LEGACY_FIRESTORE_DOC_ID);
      await setDoc(docRef, { projects: JSON.stringify(projects) }, { merge: true });
      return true;
    } catch (error) {
      console.warn('[PersistenceService] Error saving legacy projects:', error.message);
      return false;
    }
  });
}
