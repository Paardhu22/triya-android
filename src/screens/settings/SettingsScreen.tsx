import { Alert, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { useAuth } from '@/store';
import { spacing } from '@/theme';

export function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen edges={['bottom']} scrollable>
      <View style={styles.section}>
        <SectionHeader title="Account" />
        <Card>
          <ListItem 
            title="Profile" 
            icon="account-outline" 
            onPress={() => router.push('/(main)/settings/profile' as any)} 
          />
          <Divider style={{ marginVertical: 0 }} />
          <ListItem 
            title="Change Password" 
            icon="lock-outline" 
            onPress={() => Alert.alert('Coming soon', 'Password change will be added soon')} 
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Application" />
        <Card>
          <ListItem 
            title="About Triya Manager" 
            icon="information-outline" 
            onPress={() => Alert.alert('Triya Manager', 'Version 1.0.0\nPhase 1 UI Prototype')} 
          />
          <Divider style={{ marginVertical: 0 }} />
          <ListItem 
            title="Privacy Policy" 
            icon="shield-outline" 
            onPress={() => Alert.alert('Coming soon', 'Privacy policy will be added soon')} 
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card>
          <ListItem 
            title="Sign Out" 
            icon="logout" 
            destructive
            onPress={handleSignOut} 
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
