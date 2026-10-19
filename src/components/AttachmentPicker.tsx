import { uploadError } from '@/utils/uploadPolicy';
import { getUploadPolicy } from '@/data/client';
import { View } from 'react-native';
import { Button } from './Button';
import { Typography } from './Typography';
import { toast } from './Toast';
import { camera, gallery, documents } from '@/services/media';
import type { PickedFile } from '@/services/types';
import { spacing } from '@/theme';

export function AttachmentPicker({ value, onChange, label = 'Attachment', imagesOnly = false, disabled = false }: {
  value: PickedFile | null; onChange: (file: PickedFile | null) => void; label?: string; imagesOnly?: boolean; disabled?: boolean;
}) {
  async function pick(source: 'camera' | 'gallery' | 'document') {
    const result = await (source === 'camera' ? camera.capturePhoto() : source === 'gallery' ? gallery.pickImage() : documents.pickDocument());
    if (!result.available) { toast.error(result.reason); return; }
    if (!result.file) return;
    const error = uploadError(result.file, getUploadPolicy());
    if (error) { toast.error(error); return; }
    onChange(result.file);
  }
  return <View style={{ gap: spacing.sm }}>
    <Typography variant="captionMedium" color="textSecondary">{label}</Typography>
    {value ? <>
      <Typography variant="small" numberOfLines={2}>{value.name}</Typography>
      <Button title="Remove attachment" variant="ghost" size="sm" disabled={disabled} onPress={() => onChange(null)} />
    </> : <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
      <Button title="Camera" icon="camera-outline" variant="outline" size="sm" disabled={disabled} onPress={() => void pick('camera')} />
      <Button title="Gallery" icon="image-outline" variant="outline" size="sm" disabled={disabled} onPress={() => void pick('gallery')} />
      {!imagesOnly && <Button title="File" icon="file-outline" variant="outline" size="sm" disabled={disabled} onPress={() => void pick('document')} />}
    </View>}
  </View>;
}
