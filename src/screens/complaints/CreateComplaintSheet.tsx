import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import {
  BottomSheet,
  Button,
  FilterChips,
  SegmentedControl,
  TextInput,
  Typography,
} from '@/components';
import { useAction, useAssignableUsers } from '@/hooks';
import { createComplaint } from '@/mocks';
import { useActiveProperty } from '@/store';
import { colors, spacing } from '@/theme';
import type { ComplaintPriority } from '@/types';

export interface CreateComplaintSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful create so the list can refetch. */
  onCreated: () => void;
}

const UNASSIGNED = 'none';

/**
 * CreateComplaintSheet
 *
 * The web's "New complaint" dialog as a bottom sheet: title, optional
 * description, priority (defaults MEDIUM) and an optional assignee from the
 * property's staff. New complaints always start OPEN.
 */
export function CreateComplaintSheet({ visible, onClose, onCreated }: CreateComplaintSheetProps) {
  const property = useActiveProperty();
  const { data: users } = useAssignableUsers(property.id);
  const { busy, run } = useAction();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('MEDIUM');
  const [assignedToId, setAssignedToId] = useState<string>(UNASSIGNED);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setAssignedToId(UNASSIGNED);
      setError(null);
    }
  }, [visible]);

  async function onSubmit() {
    const result = await run(() =>
      createComplaint({
        propertyId: property.id,
        title,
        description: description.trim() || null,
        priority,
        assignedToId: assignedToId === UNASSIGNED ? null : assignedToId,
      }),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="New complaint">
      <View style={styles.form}>
        <Typography variant="caption" color="textSecondary">
          Log a complaint for this property.
        </Typography>

        <TextInput
          label="Title"
          placeholder="e.g. WiFi not working"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (error) setError(null);
          }}
        />
        <TextInput
          label="Description"
          placeholder="Add any helpful details (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <View style={styles.fieldBlock}>
          <Typography variant="captionMedium" color="textSecondary">
            Priority
          </Typography>
          <SegmentedControl
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
            ]}
            value={priority}
            onChange={setPriority}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Typography variant="captionMedium" color="textSecondary">
            Assign to
          </Typography>
          <FilterChips
            value={assignedToId}
            onChange={setAssignedToId}
            options={[
              { value: UNASSIGNED, label: 'Unassigned' },
              ...(users ?? []).map((user) => ({ value: user.id, label: user.name })),
            ]}
          />
        </View>

        {error && (
          <Typography variant="caption" colorValue={colors.error}>
            {error}
          </Typography>
        )}

        <Button
          title="Create complaint"
          icon="plus"
          loading={busy}
          disabled={!title.trim()}
          onPress={onSubmit}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  multiline: {
    height: 88,
    textAlignVertical: 'top',
    paddingTop: spacing.sm + 4,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
});
