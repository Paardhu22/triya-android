import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, ConfirmDialog, FilterChips, TextInput, Typography, toast } from '@/components';
import { useAction, useExpenseCategories } from '@/hooks';
import { createCategory, renameCategory, deleteCategory, createSubcategory, renameSubcategory, deleteSubcategory } from '@/data';
import { useActiveProperty } from '@/store';
import { spacing } from '@/theme';

export function CategoryManagerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const property = useActiveProperty();
  const { data } = useExpenseCategories(property.id, visible);
  const { busy, run } = useAction();
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [subName, setSubName] = useState('');
  const [remove, setRemove] = useState<{ id: string; name: string; sub: boolean } | null>(null);
  const category = data?.find(c => c.id === selected);
  async function save(action: () => ReturnType<typeof createCategory>) {
    const result = await run(action);
    if (!result.ok) { toast.error(result.error); return; }
    setName(''); setSubName(''); toast.success('Categories updated');
  }
  return <>
    <BottomSheet visible={visible} onClose={onClose} title="Expense categories">
      <View style={{ gap: spacing.md }}>
        <TextInput label="New category" value={name} onChangeText={setName} placeholder="e.g. Repairs" />
        <Button title="Add category" disabled={!name.trim() || busy} loading={busy} onPress={() => void save(() => createCategory(name.trim()))} />
        <Typography variant="captionMedium">Manage existing</Typography>
        <FilterChips value={selected} onChange={setSelected} options={(data ?? []).map(c => ({ value: c.id, label: c.name }))} />
        {category && <>
          <TextInput label="Rename selected category" value={subName} onChangeText={setSubName} placeholder={category.name} />
          <Button title="Rename category" variant="outline" disabled={!subName.trim() || busy} onPress={() => void save(() => renameCategory(category.id, subName.trim()))} />
          <Button title="Delete category" variant="ghost" disabled={busy} onPress={() => setRemove({ ...category, sub: false })} />
          <Subcategories key={category.id} category={category} busy={busy} save={save} onRemove={(id, name) => setRemove({ id, name, sub: true })} />
        </>}
      </View>
    </BottomSheet>
    <ConfirmDialog visible={!!remove} title="Delete category" message={`Delete ${remove?.name ?? ''}? Categories used by expenses cannot be deleted.`}
      confirmLabel="Delete" destructive loading={busy} onCancel={() => setRemove(null)} onConfirm={async () => {
        if (!remove) return;
        const result = await run(() => remove.sub ? deleteSubcategory(remove.id) : deleteCategory(remove.id));
        if (!result.ok) toast.error(result.error);
        setRemove(null);
      }} />
  </>;
}
function Subcategories({ category, busy, save, onRemove }: {
  category: { id: string; subcategories: { id: string; name: string }[] }; busy: boolean;
  save: (action: () => ReturnType<typeof createCategory>) => Promise<void>; onRemove: (id: string, name: string) => void;
}) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  return <View style={{ gap: spacing.sm }}>
    <Typography variant="captionMedium">Subcategories</Typography>
    <FilterChips value={selected} onChange={setSelected} options={[{ value: '', label: 'New subcategory' }, ...category.subcategories.map(s => ({ value: s.id, label: s.name }))]} />
    <TextInput label={selected ? 'Rename subcategory' : 'New subcategory'} value={name} onChangeText={setName} />
    <Button title={selected ? 'Rename subcategory' : 'Add subcategory'} variant="outline" disabled={!name.trim() || busy} onPress={async () => {
      await save(() => selected ? renameSubcategory(selected, name.trim()) : createSubcategory(category.id, name.trim())); setName('');
    }} />
    {selected && <Button title="Delete subcategory" variant="ghost" disabled={busy} onPress={() => onRemove(selected, category.subcategories.find(s => s.id === selected)?.name ?? '')} />}
  </View>;
}
