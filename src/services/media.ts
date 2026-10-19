import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { uploadError } from '@/utils/uploadPolicy';
import { request, getUploadPolicy } from '@/data/client';
import { notifyDbChanged } from '@/data/db';
import type { DocumentType } from '@/types';
import type { PickedFile, ServiceResult } from './types';

export interface CameraService { capturePhoto(): Promise<ServiceResult<{ file: PickedFile | null }>> }
export interface GalleryService { pickImage(): Promise<ServiceResult<{ file: PickedFile | null }>> }
export interface DocumentUploadService {
  pickDocument(): Promise<ServiceResult<{ file: PickedFile | null }>>;
  upload(file: PickedFile, tenantId: string, type: DocumentType): Promise<ServiceResult<{ storageKey: string }>>;
}
function imageFile(result: ImagePicker.ImagePickerResult): PickedFile | null {
  if (result.canceled) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize };
}
export const camera: CameraService = {
  async capturePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { available: false, reason: 'Allow camera access in device settings to take a photo.' };
      return { available: true, file: imageFile(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })) };
    } catch { return { available: false, reason: 'Could not open the camera.' }; }
  },
};
export const gallery: GalleryService = {
  async pickImage() {
    try { return { available: true, file: imageFile(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })) }; }
    catch { return { available: false, reason: 'Could not open the photo library.' }; }
  },
};
/** RN FormData accepts a URI descriptor; browsers require a Blob. */
export async function appendPickedFile(data: FormData, key: string, file: PickedFile) {
  const error = uploadError(file, getUploadPolicy());
  if (error) throw new Error(error);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    data.append(key, blob, file.name);
  } else {
    data.append(key, { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  }
}
export const documents: DocumentUploadService = {
  async pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: getUploadPolicy().allowedMimeTypes, copyToCacheDirectory: true });
      if (result.canceled) return { available: true, file: null };
      const asset = result.assets[0];
      return { available: true, file: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream', size: asset.size } };
    } catch { return { available: false, reason: 'Could not open the document picker.' }; }
  },
  async upload(file, tenantId, type) {
    try {
      const body = new FormData(); body.set('tenantId', tenantId); body.set('type', type);
      await appendPickedFile(body, 'file', file);
      const result = await request<{ data: { storageKey: string } }>('documents', { method: 'POST', body });
      notifyDbChanged();
      return { available: true, storageKey: result.data.storageKey };
    } catch (error) { return { available: false, reason: error instanceof Error ? error.message : 'Document upload failed' }; }
  },
};
