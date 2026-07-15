import { View, StyleSheet } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { Screen } from '@/components/Screen';
import { Typography } from '@/components/Typography';
import { useAuth } from '@/store';
import { spacing, colors } from '@/theme';

export function ProfileScreen() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Screen edges={['bottom']} scrollable>
      <View style={styles.header}>
        <Avatar name={user.name} size="xl" />
        <Typography variant="h2" style={styles.name}>{user.name}</Typography>
        <Typography variant="bodyMedium" color="textSecondary">{user.role}</Typography>
      </View>

      <View style={styles.content}>
        <Card>
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">Email</Typography>
            <Typography variant="bodyMedium">{user.email}</Typography>
          </View>
          <Divider verticalSpacing="md" />
          <View style={styles.detailRow}>
            <Typography variant="captionMedium" color="textSecondary">Role</Typography>
            <Typography variant="bodyMedium" style={{ textTransform: 'capitalize' }}>
              {user.role.toLowerCase()}
            </Typography>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.background,
  },
  name: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  content: {
    paddingTop: spacing.lg,
  },
  detailRow: {
    gap: 2,
  },
});
