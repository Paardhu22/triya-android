import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { colors, spacing } from '@/theme';

export function SessionRecovery({ message, retrying, onRetry, onSignOut }: {
  message: string; retrying: boolean; onRetry: () => void; onSignOut: () => void;
}) {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Typography variant="h2" accessibilityRole="header">Can’t reach Triya</Typography>
        <Typography color="textSecondary" accessibilityLiveRegion="polite">{message}</Typography>
        <Button title="Try again" loading={retrying} onPress={onRetry} />
        <Button title="Sign out and use another account" variant="outline" disabled={retrying} onPress={onSignOut} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { width: '100%', maxWidth: 440, gap: spacing.lg },
});
