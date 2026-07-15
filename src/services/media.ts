/**
 * Camera, gallery and document-upload abstractions.
 *
 * Consumers (KYC capture, expense receipts) depend on these interfaces only.
 * Implementation plan:
 * - camera   -> expo-camera / expo-image-picker (launchCameraAsync)
 * - gallery  -> expo-image-picker (launchImageLibraryAsync)
 * - documents-> expo-document-picker, then upload via the backend's
 *               authenticated /api/files storage route
 */

import { notImplemented, type PickedFile, type ServiceResult } from './types';

export interface CameraService {
  /** Capture a photo (KYC photo, receipt). */
  capturePhoto(): Promise<ServiceResult<{ file: PickedFile }>>;
}

export interface GalleryService {
  /** Pick a single image from the device gallery. */
  pickImage(): Promise<ServiceResult<{ file: PickedFile }>>;
}

export interface DocumentUploadService {
  /** Pick a document (PDF/image) for a tenant's KYC records. */
  pickDocument(): Promise<ServiceResult<{ file: PickedFile }>>;
  /**
   * Upload to the backend storage driver; resolves to the storage key the
   * Document/Tenant record stores (never a public URL).
   */
  upload(file: PickedFile): Promise<ServiceResult<{ storageKey: string }>>;
}

export const camera: CameraService = {
  async capturePhoto() {
    return notImplemented('Camera capture');
  },
};

export const gallery: GalleryService = {
  async pickImage() {
    return notImplemented('Gallery picker');
  },
};

export const documents: DocumentUploadService = {
  async pickDocument() {
    return notImplemented('Document picker');
  },
  async upload() {
    return notImplemented('Document upload');
  },
};
