import { Pressable, View, StyleSheet } from 'react-native';

import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import { Typography } from '@/components/Typography';
import { COMPLAINT_PRIORITY_META, COMPLAINT_STATUS_META } from '@/constants';
import type { ComplaintListItem } from '@/mocks';
import { colors, spacing, borderRadius } from '@/theme';
import { formatDayMonth } from '@/utils';

export interface ComplaintCardProps {
  complaint: ComplaintListItem;
  onPress: () => void;
}

/**
 * ComplaintCard component.
 *
 * A complaint list row: title, one-line description, priority + status
 * badges, assignee and age. Replaces the web's complaints table row.
 *
 * @example
 * <ComplaintCard complaint={item} onPress={() => router.push(`/complaints/${item.id}`)} />
 */
export function ComplaintCard({ complaint, onPress }: ComplaintCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={complaint.title}
    >
      <View style={styles.titleRow}>
        <Typography variant="bodyMedium" numberOfLines={1} style={styles.title}>
          {complaint.title}
        </Typography>
        <Typography variant="small" color="textTertiary">
          {formatDayMonth(complaint.createdAt)}
        </Typography>
      </View>

      {complaint.description && (
        <Typography variant="caption" color="textSecondary" numberOfLines={1}>
          {complaint.description}
        </Typography>
      )}

      <View style={styles.metaRow}>
        <StatusBadge meta={COMPLAINT_STATUS_META[complaint.status]} size="sm" />
        <StatusBadge meta={COMPLAINT_PRIORITY_META[complaint.priority]} size="sm" />
        <View style={styles.assignee}>
          <Icon name="account-outline" size={14} color={colors.textTertiary} />
          <Typography variant="small" color="textSecondary" numberOfLines={1}>
            {complaint.assignedToName ?? 'Unassigned'}
          </Typography>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm - 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  assignee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
    flexShrink: 1,
  },
});
