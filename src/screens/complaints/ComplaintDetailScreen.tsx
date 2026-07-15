import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { FilterChips } from '@/components/FilterChips';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { Typography } from '@/components/Typography';
import { enterHeader, enterItem } from '@/components/motion';
import { COMPLAINT_PRIORITY_META, COMPLAINT_STATUS_META } from '@/constants';
import { useAction, useAssignableUsers, useComplaint } from '@/hooks';
import { updateComplaint } from '@/mocks/actions';
import { useActiveProperty } from '@/store';
import { spacing } from '@/theme';
import { formatFullDate, roomLabel } from '@/utils';
import type { ComplaintPriority, ComplaintStatus } from '@/types';

const UNASSIGNED = 'none';

/**
 * ComplaintDetailScreen
 *
 * One complaint with the web's inline management: status, priority and
 * assignee change directly (the web table's dropdown actions, as touch
 * controls). Resolving stamps resolvedAt, exactly like the web action.
 */
export function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = useActiveProperty();
  const { data: complaint, isLoading, refetch } = useComplaint(id);
  const { data: users } = useAssignableUsers(property.id);
  const { busy, run } = useAction();

  if (isLoading || !complaint) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.skeletons}>
          <Skeleton height={96} radius={12} />
          <Skeleton height={140} radius={12} />
          <Skeleton height={180} radius={12} />
        </View>
      </Screen>
    );
  }

  const patch = (data: Parameters<typeof updateComplaint>[1]) => {
    run(() => updateComplaint(complaint.id, data)).then((res) => {
      if (res.ok) refetch();
    });
  };

  return (
    <Screen edges={['bottom']} scrollable>
      <Animated.View entering={enterHeader()} style={styles.header}>
        <Typography variant="h2">{complaint.title}</Typography>
        <Typography variant="caption" color="textSecondary">
          Created {formatFullDate(complaint.createdAt)}
          {complaint.resolvedAt ? ` · Resolved ${formatFullDate(complaint.resolvedAt)}` : ''}
        </Typography>
        <View style={styles.metaRow}>
          <StatusBadge meta={COMPLAINT_STATUS_META[complaint.status]} />
          <StatusBadge meta={COMPLAINT_PRIORITY_META[complaint.priority]} />
        </View>
      </Animated.View>

      <Animated.View entering={enterItem(0)} style={styles.section}>
        <SectionHeader title="Details" />
        <Card flat>
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">
              Description
            </Typography>
            <Typography variant="body">
              {complaint.description || 'No description provided.'}
            </Typography>
          </View>
          <Divider verticalSpacing="md" />
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">
              Reported by
            </Typography>
            <Typography variant="body">{complaint.tenantName ?? 'Staff'}</Typography>
          </View>
          <Divider verticalSpacing="md" />
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">
              Location
            </Typography>
            <Typography variant="body">
              {complaint.roomNumber
                ? roomLabel(complaint.roomNumber, property.isFlat)
                : 'Common area'}
            </Typography>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={enterItem(1)} style={styles.section}>
        <SectionHeader
          title="Manage"
          subtitle="Changes apply immediately."
        />
        <Card flat style={styles.manageCard}>
          <View style={styles.fieldBlock}>
            <Typography variant="captionMedium" color="textSecondary">
              Status
            </Typography>
            <SegmentedControl<ComplaintStatus>
              options={[
                { value: 'OPEN', label: 'Open' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'RESOLVED', label: 'Resolved' },
              ]}
              value={complaint.status}
              onChange={(status) => status !== complaint.status && patch({ status })}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Typography variant="captionMedium" color="textSecondary">
              Priority
            </Typography>
            <SegmentedControl<ComplaintPriority>
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
              ]}
              value={complaint.priority}
              onChange={(priority) => priority !== complaint.priority && patch({ priority })}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Typography variant="captionMedium" color="textSecondary">
              Assigned to
            </Typography>
            <FilterChips
              value={complaint.assignedToId ?? UNASSIGNED}
              onChange={(next) =>
                patch({ assignedToId: next === UNASSIGNED ? null : next })
              }
              options={[
                { value: UNASSIGNED, label: 'Unassigned' },
                ...(users ?? []).map((user) => ({ value: user.id, label: user.name })),
              ]}
            />
          </View>

          {busy && (
            <Typography variant="small" color="textTertiary">
              Saving…
            </Typography>
          )}
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletons: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  header: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    gap: 2,
  },
  manageCard: {
    gap: spacing.md,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
});
