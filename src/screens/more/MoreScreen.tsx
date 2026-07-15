import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Typography } from '@/components/Typography';
import { TabHeader } from '@/screens/shared/TabHeader';
import { useAuth, useActiveProperty } from '@/store';
import { spacing } from '@/theme';

export function MoreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const property = useActiveProperty();

  return (
    <Screen edges={['top']} scrollable padded={false}>
      <TabHeader title="More" />
      
      <View style={styles.content}>
        {user && (
          <View style={styles.profileSection}>
            <Avatar name={user.name} size="lg" />
            <Typography variant="h2" style={styles.name}>{user.name}</Typography>
            <Typography variant="bodyMedium" color="textSecondary" style={styles.role}>
              {user.role.toLowerCase()}
            </Typography>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Property Management" subtitle={property.name} />
          <Card>
            <ListItem 
              title="Complaints" 
              icon="alert-circle-outline" 
              onPress={() => router.push('/(main)/complaints' as any)} 
            />
            <Divider style={{ marginVertical: 0 }} />
            <ListItem
              title="Expense Tracker"
              icon="receipt"
              onPress={() => router.push('/(main)/expenses' as any)}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Application" />
          <Card>
            <ListItem 
              title="Notifications" 
              icon="bell-outline" 
              onPress={() => router.push('/(main)/notifications' as any)} 
            />
            <Divider style={{ marginVertical: 0 }} />
            <ListItem 
              title="Settings" 
              icon="cog-outline" 
              onPress={() => router.push('/(main)/settings' as any)} 
            />
          </Card>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  name: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  role: {
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: spacing.xl,
  },
});
