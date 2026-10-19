export interface UploadPolicy { maxFileBytes: number; allowedMimeTypes: string[] }
export const DEFAULT_UPLOAD_POLICY: UploadPolicy = {
  maxFileBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
};
export function uploadError(file: { size?: number; mimeType: string }, policy: UploadPolicy): string | null {
  if (!policy.allowedMimeTypes.includes(file.mimeType)) return 'Choose a JPEG, PNG, WebP, HEIC image or PDF supported by this property.';
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size && file.size > policy.maxFileBytes) return `Choose a file smaller than ${Math.round(policy.maxFileBytes / 1024 / 1024 * 10) / 10} MB.`;
  return null;
}
