import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export { toCsv } from '@/utils/csv';

export async function shareCsv(filename: string, csv: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device');
  const file = new File(Paths.cache, filename.replace(/[^a-zA-Z0-9._-]/g, '-'));
  file.create({ overwrite: true }); file.write(`\uFEFF${csv}`);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export CSV', UTI: 'public.comma-separated-values-text' });
}
