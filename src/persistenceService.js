// =============================================================================
// Persistence Service - Per-Workspace Storage & Firestore Subcollection API
// =============================================================================
// This module implements:
// - Per-workspace localStorage schema (cm-meta, cm-proj-*, cm-ws-*, cm-tasks-*)
// - Firestore subcollection-based read/write functions
// - Debounced save helpers for App.jsx integration
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

/** Schema version for the per-workspace format */
const SCHEMA_VERSION = 2;

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generate a unique ID using crypto.randomUUID() with fallback.
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
 * 1. Try loading from Firestore (userMeta -> project -> workspaces -> tasks)
 * 2. If Firestore data found, hydrate localStorage with it
 * 3. Fall back to localStorage cm-* keys if Firestore fails/unavailable
 * 4. If no data exists anywhere, return empty state (caller creates default project)
 * 
 * Memory strategy: Only the active project's workspaces are loaded into memory.
 * 
 * @returns {Promise<{
 *   projects: Map<string, object>,
 *   activeWorkspaces: Map<string, object>,
 *   tasks: Array,
 *   taskGroups: Array,
 *   activeProjectId: string|null,
 *   defaultProjectId: string|null,
 *   source: 'firestore'|'localStorage'
 * }>}
 */
export async function initializePersistence() {
  // Step 1: Try Firestore first
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

        // Hydrate localStorage with Firestore data
        saveMeta({ activeProjectId, defaultProjectId, schemaVersion: SCHEMA_VERSION });
        saveProjectMeta(activeProjectId, projectMeta);
        for (const [wsId, wsData] of activeWorkspaces) {
          saveWorkspace(activeProjectId, wsId, wsData);
        }
        saveTasks(activeProjectId, { tasks, taskGroups });

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

  // Step 2: Fall back to localStorage cm-* keys
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

  // Step 3: Nothing found - return empty state
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
