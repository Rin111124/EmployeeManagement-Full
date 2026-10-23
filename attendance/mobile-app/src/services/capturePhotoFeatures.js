import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { aiApi } from './api';

/**
 * Safely delete photo file from disk to ensure zero-leakage of raw biometric images.
 * Fail-closed design: If deletion fails, throw an error.
 */
export async function deletePhoto(photoUri) {
  if (!photoUri) return;
  try {
    // 1. Try modern File API (Expo SDK 54+)
    if (typeof File === 'function') {
      try {
        const file = new File(photoUri);
        if (typeof file?.delete === 'function') {
          if (file.exists) {
            file.delete();
          }
          return;
        }
      } catch {
        // Fall back to legacy API if File constructor fails on URI scheme
      }
    }

    // 2. Fallback to legacy API
    if (LegacyFileSystem?.deleteAsync) {
      await LegacyFileSystem.deleteAsync(photoUri, { idempotent: true });
    }
  } catch (err) {
    console.error('[SECURITY] Captured face image could not be deleted:', err.message);
    throw new Error('Captured face image could not be deleted fail-closed');
  }
}

/**
 * Capture frame, extract embeddings via AI service, and immediately
 * purge the raw image from local storage (Zero-Leakage guarantee).
 */
export async function capturePhotoFeatures(cameraRef, config) {
  if (!cameraRef?.current?.takePictureAsync) {
    throw new Error('Camera is not ready');
  }

  let photo = null;
  try {
    photo = await cameraRef.current.takePictureAsync({
      quality: 0.85,
      base64: false,
      skipProcessing: false,
    });

    if (!photo?.uri) {
      throw new Error('Camera failed to capture photo');
    }

    const result = await aiApi.extractFeatures(photo.uri, config);
    return result;
  } finally {
    if (photo?.uri) {
      await deletePhoto(photo.uri);
    }
  }
}
