import { View } from 'react-native';
import { BottomSheet, Button, DateField, FilterChips, TextInput, Typography } from '@/components';
import { spacing } from '@/theme';
import { DEFAULT_FILTERS, type ExpenseFilters } from '@/utils/expenseFilters';
import { toISODateOnly } from '@/utils';

export function ExpenseFiltersSheet({ visible, onClose, filters, onChange }: {
  visible: boolean; onClose: () => void; filters: ExpenseFilters; onChange: (filters: ExpenseFilters) => void;
}) {
  function set<K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) { onChange({ ...filters, [key]: value }); }
  return <BottomSheet visible={visible} onClose={onClose} title="Expense filters" footer={<Button title="Done" onPress={onClose} />}>
    <View style={{ gap: spacing.md }}>
      <Typography variant="captionMedium">Sort</Typography>
      <FilterChips value={filters.sort} onChange={v => set('sort', v)} options={[
        { value: 'latest', label: 'Latest' }, { value: 'oldest', label: 'Oldest' },
        { value: 'highest', label: 'Highest amount' }, { value: 'lowest', label: 'Lowest amount' },
      ]} />
      <TextInput label="Vendor" value={filters.vendor} onChangeText={v => set('vendor', v)} placeholder="Any vendor" />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}><TextInput label="Minimum (₹)" keyboardType="decimal-pad" value={filters.amountMin} onChangeText={v => set('amountMin', v)} placeholder="Any" /></View>
        <View style={{ flex: 1 }}><TextInput label="Maximum (₹)" keyboardType="decimal-pad" value={filters.amountMax} onChangeText={v => set('amountMax', v)} placeholder="Any" /></View>
      </View>
      <Typography variant="captionMedium">Date range</Typography>
      <FilterChips value={filters.dateFrom || filters.dateTo ? 'CUSTOM' : 'ALL'} onChange={v => {
        const now = new Date();
        onChange({ ...filters, dateFrom: v === 'ALL' ? '' : toISODateOnly(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: v === 'ALL' ? '' : toISODateOnly(now) });
      }} options={[{ value: 'ALL', label: 'All dates' }, { value: 'CUSTOM', label: 'Choose range' }]} />
      {(filters.dateFrom || filters.dateTo) && <>
        <DateField label="From" value={new Date(`${filters.dateFrom}T12:00:00`)} onChange={v => set('dateFrom', toISODateOnly(v))} />
        <DateField label="To" value={new Date(`${filters.dateTo}T12:00:00`)} onChange={v => set('dateTo', toISODateOnly(v))} minimumDate={new Date(`${filters.dateFrom}T00:00:00`)} />
      </>}
      <Typography variant="captionMedium">Receipt</Typography>
      <FilterChips value={filters.hasReceipt} onChange={v => set('hasReceipt', v)} options={[
        { value: 'any', label: 'Any' }, { value: 'yes', label: 'With receipt' }, { value: 'no', label: 'Without receipt' },
      ]} />
      <Button title="Reset filters" variant="ghost" onPress={() => onChange({ ...DEFAULT_FILTERS })} />
    </View>
  </BottomSheet>;
}
