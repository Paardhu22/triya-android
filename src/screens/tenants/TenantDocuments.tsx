import { useState } from 'react';
import { View } from 'react-native';
import { Button, ErrorState, FilterChips, ListRow, Typography, toast } from '@/components';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { openStoredFile } from '@/data/client';
import { getDb } from '@/data/db';
import { useAsyncData } from '@/hooks';
import { documents } from '@/services/media';
import type { PickedFile } from '@/services/types';
import type { DocumentType } from '@/types';
import { spacing } from '@/theme';

export function TenantDocuments({ tenantId, photoKey }: { tenantId: string; photoKey: string | null }) {
  const { data, error, refetch, isLoading } = useAsyncData(() => getDb().documents.filter(d => d.tenantId === tenantId), [tenantId]);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [type, setType] = useState<DocumentType>('OTHER');
  const [busy, setBusy] = useState(false);
  async function open(key: string) {
    try { await openStoredFile(key); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not open file'); }
  }
  async function upload() {
    if (!file || busy) return;
    if (type === 'PHOTO' && !file.mimeType.startsWith('image/')) { toast.error('Choose an image for the tenant photo'); return; }
    setBusy(true);
    const result = await documents.upload(file, tenantId, type);
    setBusy(false);
    if (!result.available) { toast.error(result.reason); return; }
    setFile(null); toast.success('Document uploaded');
  }
  return <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
    {photoKey && !(data ?? []).some(d => d.storageKey === photoKey) && <ListRow title="View KYC photo" icon="image-outline" onPress={() => void open(photoKey)} />}
    {(data ?? []).map(d => <ListRow key={d.id} title={d.filename} subtitle={d.type.replace(/_/g, ' ')} icon="file-document-outline" onPress={() => void open(d.storageKey)} />)}
    {error && !data && <ErrorState message={error} onRetry={refetch} />}
    {!isLoading && !error && !data?.length && !photoKey && <Typography variant="small" color="textTertiary">No KYC documents uploaded yet.</Typography>}
    <Typography variant="captionMedium">Upload document</Typography>
    <FilterChips value={type} onChange={setType} options={[
      { value: 'OTHER', label: 'Other' }, { value: 'PHOTO', label: 'Photo' },
      { value: 'AADHAAR_FRONT', label: 'Aadhaar front' }, { value: 'AADHAAR_BACK', label: 'Aadhaar back' },
      { value: 'PAN', label: 'PAN' }, { value: 'AGREEMENT', label: 'Agreement' },
    ]} />
    <AttachmentPicker value={file} onChange={setFile} disabled={busy} />
    {file && <Button title="Upload document" loading={busy} onPress={() => void upload()} />}
  </View>;
}
