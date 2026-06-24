import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';

/**
 * Upload an image file to Firebase Storage and return the download URL.
 * @param {File|Blob} file - The image file or blob to upload.
 * @param {string} projectId - The project ID.
 * @param {string} workspaceId - The workspace ID.
 * @param {string} imageId - The unique image ID.
 * @returns {Promise<string|null>} The download URL, or null on failure.
 */
export async function uploadImage(file, projectId, workspaceId, imageId) {
  if (!isFirebaseConfigured() || !storage) {
    console.warn('[ImageStorage] Firebase not configured, skipping upload.');
    return null;
  }
  try {
    const storagePath = `images/${projectId}/${workspaceId}/${imageId}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.warn('[ImageStorage] Upload failed:', error.message);
    return null;
  }
}

/**
 * Delete an image file from Firebase Storage.
 * @param {string} projectId - The project ID.
 * @param {string} workspaceId - The workspace ID.
 * @param {string} imageId - The unique image ID.
 */
export async function deleteImage(projectId, workspaceId, imageId) {
  if (!isFirebaseConfigured() || !storage) {
    return;
  }
  try {
    const storagePath = `images/${projectId}/${workspaceId}/${imageId}`;
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn('[ImageStorage] Delete failed:', error.message);
  }
}

/**
 * Batch delete all specified images from Firebase Storage for a workspace.
 * @param {string} projectId - The project ID.
 * @param {string} workspaceId - The workspace ID.
 * @param {string[]} imageIds - Array of image IDs to delete.
 */
export async function deleteWorkspaceImages(projectId, workspaceId, imageIds) {
  if (!isFirebaseConfigured() || !storage || !imageIds || imageIds.length === 0) {
    return;
  }
  const promises = imageIds.map(imageId => {
    const storagePath = `images/${projectId}/${workspaceId}/${imageId}`;
    const storageRef = ref(storage, storagePath);
    return deleteObject(storageRef).catch(error => {
      console.warn(`[ImageStorage] Failed to delete ${imageId}:`, error.message);
    });
  });
  await Promise.all(promises);
}
