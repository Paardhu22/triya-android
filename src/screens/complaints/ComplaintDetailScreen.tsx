import { Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Typography } from '@/components/Typography';
import { COMPLAINT_PRIORITY_META, COMPLAINT_STATUS_META } from '@/constants';
import { useAction, useComplaint } from '@/hooks';
import { updateComplaint } from '@/mocks/actions';
import { spacing } from '@/theme';
import { formatFullDate } from '@/utils';

export function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: complaint, isLoading, refetch } = useComplaint(id);

  const { busy: isUpdating, run: runUpdate } = useAction();

  if (isLoading || !complaint) return null;

  const handleMarkResolved = () => {
    Alert.alert('Resolve Complaint', 'Mark this complaint as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Resolve', 
        onPress: () => {
          runUpdate(() => updateComplaint(id, { status: 'RESOLVED' })).then(() => refetch());
        }
      },
    ]);
  };

  return (
    <Screen edges={['bottom']} scrollable>
      <View style={styles.header}>
        <Typography variant="h2">{complaint.title}</Typography>
        <Typography variant="bodyMedium" color="textSecondary" style={styles.date}>
          Created {formatFullDate(complaint.createdAt)}
        </Typography>
        <View style={styles.metaRow}>
          <StatusBadge meta={COMPLAINT_STATUS_META[complaint.status]} />
          <StatusBadge meta={COMPLAINT_PRIORITY_META[complaint.priority]} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Details" />
        <Card>
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">Description</Typography>
            <Typography variant="bodyMedium">{complaint.description || 'No description provided'}</Typography>
          </View>
          <Divider verticalSpacing="md" />
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">Assignee</Typography>
            <Typography variant="bodyMedium">{complaint.assignedToName || 'Unassigned'}</Typography>
          </View>
          <Divider verticalSpacing="md" />
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">Location</Typography>
            <Typography variant="bodyMedium">Room {complaint.roomNumber}</Typography>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Actions" />
        <Card>
          {complaint.status !== 'RESOLVED' && (
            <>
              <ListItem 
                title="Mark Resolved" 
                icon="check-circle-outline" 
                onPress={handleMarkResolved}
                disabled={isUpdating}
              />
              <Divider style={{ marginVertical: 0 }} />
            </>
          )}
          <ListItem 
            title="Update Priority" 
            icon="flag-outline" 
            onPress={() => Alert.alert('Coming soon', 'Priority updates will be added soon')}
          />
          <Divider style={{ marginVertical: 0 }} />
          <ListItem 
            title="Reassign" 
            icon="account-switch-outline" 
            onPress={() => Alert.alert('Coming soon', 'Reassignment will be added soon')}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  date: {
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  detailRow: {
    gap: 2,
  },
});
