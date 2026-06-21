/**
 * Workspace data integrity validator (development/debug only).
 *
 * Checks:
 * 1. Every node, group, pin, image, and edge has a valid workspaceId.
 * 2. Every edge source and target reference an existing object (node, group, or image).
 * 3. No object references a workspace that does not exist.
 * 4. (Optional) Task locationPinId references an existing pin, and locationWorkspaceId references an existing workspace.
 *
 * Usage:
 *   import { validateWorkspaces } from './workspaceValidator';
 *   if (import.meta.env.DEV) validateWorkspaces(workspaces, 'after import');
 *   if (import.meta.env.DEV) validateWorkspaces(workspaces, 'after import', tasks);
 */

/**
 * Validate workspace data integrity.
 * @param {Array} workspaces - The array of workspace objects to validate.
 * @param {string} [context=''] - A label describing when validation is running (e.g., 'after import').
 * @param {Array} [tasks] - Optional array of tasks to validate task-pin-workspace integrity.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateWorkspaces(workspaces, context = '', tasks) {
  const prefix = context ? `[WorkspaceValidator: ${context}]` : '[WorkspaceValidator]';
  const errors = [];
  const warnings = [];

  if (!Array.isArray(workspaces)) {
    const msg = `${prefix} workspaces is not an array`;
    console.error(msg);
    return { valid: false, errors: [msg], warnings };
  }

  // Collect the set of valid workspace IDs
  const workspaceIds = new Set(workspaces.map(ws => ws.id));

  for (const ws of workspaces) {
    if (!ws || !ws.id) {
      const msg = `${prefix} Found a workspace without an id`;
      errors.push(msg);
      console.error(msg);
      continue;
    }

    const wsLabel = `workspace "${ws.id}"`;

    // Build set of all object IDs within this workspace (nodes, groups, images)
    const objectIds = new Set();
    const nodes = ws.nodes || [];
    const edges = ws.edges || [];
    const groups = ws.groups || [];
    const pins = ws.pins || [];
    const images = ws.images || [];

    // Validate nodes
    for (const node of nodes) {
      objectIds.add(node.id);
      if (!node.workspaceId) {
        const msg = `${prefix} Node "${node.id}" in ${wsLabel} is missing workspaceId`;
        errors.push(msg);
        console.error(msg);
      } else if (!workspaceIds.has(node.workspaceId)) {
        const msg = `${prefix} Node "${node.id}" in ${wsLabel} references non-existent workspace "${node.workspaceId}"`;
        errors.push(msg);
        console.error(msg);
      } else if (node.workspaceId !== ws.id) {
        const msg = `${prefix} Node "${node.id}" in ${wsLabel} has workspaceId "${node.workspaceId}" that does not match its parent workspace`;
        warnings.push(msg);
        console.warn(msg);
      }
    }

    // Validate groups
    for (const group of groups) {
      objectIds.add(group.id);
      if (!group.workspaceId) {
        const msg = `${prefix} Group "${group.id}" in ${wsLabel} is missing workspaceId`;
        errors.push(msg);
        console.error(msg);
      } else if (!workspaceIds.has(group.workspaceId)) {
        const msg = `${prefix} Group "${group.id}" in ${wsLabel} references non-existent workspace "${group.workspaceId}"`;
        errors.push(msg);
        console.error(msg);
      } else if (group.workspaceId !== ws.id) {
        const msg = `${prefix} Group "${group.id}" in ${wsLabel} has workspaceId "${group.workspaceId}" that does not match its parent workspace`;
        warnings.push(msg);
        console.warn(msg);
      }
    }

    // Validate pins
    for (const pin of pins) {
      if (!pin.workspaceId) {
        const msg = `${prefix} Pin "${pin.id}" in ${wsLabel} is missing workspaceId`;
        errors.push(msg);
        console.error(msg);
      } else if (!workspaceIds.has(pin.workspaceId)) {
        const msg = `${prefix} Pin "${pin.id}" in ${wsLabel} references non-existent workspace "${pin.workspaceId}"`;
        errors.push(msg);
        console.error(msg);
      } else if (pin.workspaceId !== ws.id) {
        const msg = `${prefix} Pin "${pin.id}" in ${wsLabel} has workspaceId "${pin.workspaceId}" that does not match its parent workspace`;
        warnings.push(msg);
        console.warn(msg);
      }
    }

    // Validate images
    for (const image of images) {
      objectIds.add(image.id);
      if (!image.workspaceId) {
        const msg = `${prefix} Image "${image.id}" in ${wsLabel} is missing workspaceId`;
        errors.push(msg);
        console.error(msg);
      } else if (!workspaceIds.has(image.workspaceId)) {
        const msg = `${prefix} Image "${image.id}" in ${wsLabel} references non-existent workspace "${image.workspaceId}"`;
        errors.push(msg);
        console.error(msg);
      } else if (image.workspaceId !== ws.id) {
        const msg = `${prefix} Image "${image.id}" in ${wsLabel} has workspaceId "${image.workspaceId}" that does not match its parent workspace`;
        warnings.push(msg);
        console.warn(msg);
      }
    }

    // Validate edges
    for (const edge of edges) {
      if (!edge.workspaceId) {
        const msg = `${prefix} Edge "${edge.id}" in ${wsLabel} is missing workspaceId`;
        errors.push(msg);
        console.error(msg);
      } else if (!workspaceIds.has(edge.workspaceId)) {
        const msg = `${prefix} Edge "${edge.id}" in ${wsLabel} references non-existent workspace "${edge.workspaceId}"`;
        errors.push(msg);
        console.error(msg);
      } else if (edge.workspaceId !== ws.id) {
        const msg = `${prefix} Edge "${edge.id}" in ${wsLabel} has workspaceId "${edge.workspaceId}" that does not match its parent workspace`;
        warnings.push(msg);
        console.warn(msg);
      }

      // Validate edge source references an existing object
      if (edge.source && !objectIds.has(edge.source)) {
        const msg = `${prefix} Edge "${edge.id}" in ${wsLabel} has source "${edge.source}" that does not reference any existing node, group, or image`;
        errors.push(msg);
        console.error(msg);
      }

      // Validate edge target references an existing object
      if (edge.target && !objectIds.has(edge.target)) {
        const msg = `${prefix} Edge "${edge.id}" in ${wsLabel} has target "${edge.target}" that does not reference any existing node, group, or image`;
        errors.push(msg);
        console.error(msg);
      }
    }
  }

  // Validate task-pin-workspace integrity (if tasks provided)
  if (Array.isArray(tasks)) {
    // Collect all pin IDs across all workspaces
    const allPinIds = new Set();
    // Map from pinId to the workspace it belongs to
    const pinToWorkspaceId = new Map();
    for (const ws of workspaces) {
      for (const pin of (ws.pins || [])) {
        allPinIds.add(pin.id);
        pinToWorkspaceId.set(pin.id, ws.id);
      }
    }

    for (const task of tasks) {
      if (!task || !task.id) continue;

      // Validate locationPinId references an existing pin
      if (task.locationPinId && !allPinIds.has(task.locationPinId)) {
        const msg = `${prefix} Task "${task.id}" has locationPinId "${task.locationPinId}" that does not reference any existing pin`;
        errors.push(msg);
        console.error(msg);
      }

      // Validate locationWorkspaceId references an existing workspace
      if (task.locationWorkspaceId && !workspaceIds.has(task.locationWorkspaceId)) {
        const msg = `${prefix} Task "${task.id}" has locationWorkspaceId "${task.locationWorkspaceId}" that does not reference any existing workspace`;
        errors.push(msg);
        console.error(msg);
      }

      // Validate that the referenced pin actually lives in the referenced workspace
      if (task.locationPinId && task.locationWorkspaceId && allPinIds.has(task.locationPinId) && workspaceIds.has(task.locationWorkspaceId)) {
        const actualWorkspaceId = pinToWorkspaceId.get(task.locationPinId);
        if (actualWorkspaceId !== task.locationWorkspaceId) {
          const msg = `${prefix} Task "${task.id}" has locationPinId "${task.locationPinId}" that exists in workspace "${actualWorkspaceId}" but locationWorkspaceId points to "${task.locationWorkspaceId}"`;
          errors.push(msg);
          console.error(msg);
        }
      }
    }
  }

  const valid = errors.length === 0;

  if (valid && warnings.length === 0) {
    console.log(`${prefix} All workspace data is valid (${workspaces.length} workspace(s) checked)`);
  } else if (valid) {
    console.warn(`${prefix} Validation passed with ${warnings.length} warning(s)`);
  } else {
    console.error(`${prefix} Validation FAILED: ${errors.length} error(s), ${warnings.length} warning(s)`);
  }

  return { valid, errors, warnings };
}
