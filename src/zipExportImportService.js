import JSZip from 'jszip';

/**
 * Derive a file extension from a blob's content-type.
 */
function getExtensionFromBlob(blob) {
  const type = blob.type || '';
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('svg')) return 'svg';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  return 'jpg';
}

/**
 * Collect all images with URLs from an array of workspaces.
 * Returns a flat array of { image, workspaceId } objects.
 */
function collectImagesFromWorkspaces(workspaces) {
  const results = [];
  for (const ws of workspaces) {
    for (const img of (ws.images || [])) {
      if (img.url) {
        results.push({ image: img, workspaceId: ws.id });
      }
    }
  }
  return results;
}

/**
 * Download an image URL as a blob. Returns null on failure.
 */
async function fetchImageBlob(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch (err) {
    console.warn('[ZipExport] Failed to fetch image:', url, err.message);
    return null;
  }
}

/**
 * Trigger a browser download of a blob with the given filename.
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export a single project as a ZIP file.
 * 
 * @param {object} projectData - The full hydrated project data.
 * @param {string} projectName - The project name (used for the ZIP filename).
 * @returns {{ failedImageCount: number }} Result with the number of images that could not be included.
 */
export async function exportProjectAsZip(projectData, projectName) {
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');

  // Deep clone so we don't mutate the original
  const data = JSON.parse(JSON.stringify(projectData));

  // Collect all images with URLs
  const imageEntries = collectImagesFromWorkspaces(data.workspaces || []);

  // Download all image blobs in parallel
  const downloads = await Promise.all(
    imageEntries.map(async ({ image }) => {
      const blob = await fetchImageBlob(image.url);
      return { imageId: image.id, blob };
    })
  );

  // Count images that failed to download
  const failedImageCount = downloads.filter(d => d.blob === null).length;

  // Build a map of imageId -> { blob, filename }
  const imageMap = new Map();
  for (const { imageId, blob } of downloads) {
    if (blob) {
      const ext = getExtensionFromBlob(blob);
      const filename = `${imageId}.${ext}`;
      imageMap.set(imageId, { blob, filename });
    }
  }

  // Replace URLs with filenames in cloned data
  for (const ws of (data.workspaces || [])) {
    for (const img of (ws.images || [])) {
      const entry = imageMap.get(img.id);
      if (entry) {
        delete img.url;
        delete img.src;
        img.filename = entry.filename;
      }
    }
  }

  // Add project.json
  zip.file('project.json', JSON.stringify(data, null, 2));

  // Add image files
  for (const [, { blob, filename }] of imageMap) {
    imagesFolder.file(filename, blob);
  }

  // Generate and download
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const safeName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  downloadBlob(zipBlob, `${safeName}.zip`);

  return { failedImageCount };
}

/**
 * Export all projects as a full backup ZIP file.
 * 
 * @param {object} backupData - The full backup object ({ type, version, exportDate, defaultProjectId, projects }).
 * @returns {{ failedImageCount: number }} Result with the number of images that could not be included.
 */
export async function exportAllDataAsZip(backupData) {
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');

  // Deep clone
  const data = JSON.parse(JSON.stringify(backupData));

  // Collect images from all projects, keyed by projectId to avoid collisions
  const allImageEntries = [];
  for (const proj of (data.projects || [])) {
    const entries = collectImagesFromWorkspaces(proj.workspaces || []);
    for (const entry of entries) {
      allImageEntries.push({ ...entry, projectId: proj.id });
    }
  }

  // Download all image blobs in parallel
  const downloads = await Promise.all(
    allImageEntries.map(async ({ image, projectId }) => {
      const blob = await fetchImageBlob(image.url);
      return { imageId: image.id, projectId, blob };
    })
  );

  // Count images that failed to download
  const failedImageCount = downloads.filter(d => d.blob === null).length;

  // Build a composite key (projectId/imageId) -> { blob, filename } map
  const imageMap = new Map();
  for (const { imageId, projectId, blob } of downloads) {
    if (blob) {
      const ext = getExtensionFromBlob(blob);
      const filename = `${projectId}/${imageId}.${ext}`;
      const key = `${projectId}/${imageId}`;
      imageMap.set(key, { blob, filename });
    }
  }

  // Replace URLs with filenames in all projects (namespaced by project ID)
  for (const proj of (data.projects || [])) {
    for (const ws of (proj.workspaces || [])) {
      for (const img of (ws.images || [])) {
        const key = `${proj.id}/${img.id}`;
        const entry = imageMap.get(key);
        if (entry) {
          delete img.url;
          delete img.src;
          img.filename = entry.filename;
        }
      }
    }
  }

  // Add project.json (backup format)
  zip.file('project.json', JSON.stringify(data, null, 2));

  // Add image files (nested under images/<projectId>/<imageId>.<ext>)
  for (const [, { blob, filename }] of imageMap) {
    imagesFolder.file(filename, blob);
  }

  // Generate and download
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadBlob(zipBlob, `thoughtflow-backup-${dateStr}.zip`);

  return { failedImageCount };
}

/**
 * Import a single project from a ZIP file.
 * 
 * @param {File} zipFile - The ZIP file selected by the user.
 * @param {function} uploadImageFn - async (blob, projectId, workspaceId, imageId) => url
 * @returns {object} The restored project data with URLs resolved.
 */
export async function importProjectFromZip(zipFile, uploadImageFn) {
  const zip = await JSZip.loadAsync(zipFile);

  // Extract project.json
  const projectJsonFile = zip.file('project.json');
  if (!projectJsonFile) {
    throw new Error('ZIP does not contain project.json');
  }
  const projectText = await projectJsonFile.async('string');
  const projectData = JSON.parse(projectText);

  // Determine if this is a single project or a backup wrapper
  // This function handles single project only
  const projectId = projectData.id;

  // Upload images and restore URLs
  for (const ws of (projectData.workspaces || [])) {
    for (const img of (ws.images || [])) {
      if (img.filename) {
        const imagePath = `images/${img.filename}`;
        const imageFile = zip.file(imagePath);
        if (imageFile) {
          const blob = await imageFile.async('blob');
          const url = await uploadImageFn(blob, projectId, ws.id, img.id);
          if (url) {
            img.url = url;
            delete img.filename;
          }
          // If upload failed (url is null), keep img.filename so the
          // image reference is preserved and can be re-exported or retried.
        }
      }
    }
  }

  return projectData;
}

/**
 * Import a full backup from a ZIP file.
 * 
 * @param {File} zipFile - The ZIP file selected by the user.
 * @param {function} uploadImageFn - async (blob, projectId, workspaceId, imageId) => url
 * @returns {object} The restored backup data with URLs resolved.
 */
export async function importAllDataFromZip(zipFile, uploadImageFn) {
  const zip = await JSZip.loadAsync(zipFile);

  // Extract project.json
  const projectJsonFile = zip.file('project.json');
  if (!projectJsonFile) {
    throw new Error('ZIP does not contain project.json');
  }
  const projectText = await projectJsonFile.async('string');
  const backupData = JSON.parse(projectText);

  // Upload images and restore URLs for all projects
  for (const proj of (backupData.projects || [])) {
    for (const ws of (proj.workspaces || [])) {
      for (const img of (ws.images || [])) {
        if (img.filename) {
          const imagePath = `images/${img.filename}`;
          const imageFile = zip.file(imagePath);
          if (imageFile) {
            const blob = await imageFile.async('blob');
            const url = await uploadImageFn(blob, proj.id, ws.id, img.id);
            if (url) {
              img.url = url;
              delete img.filename;
            }
            // If upload failed (url is null), keep img.filename so the
            // image reference is preserved and can be re-exported or retried.
          }
        }
      }
    }
  }

  return backupData;
}
