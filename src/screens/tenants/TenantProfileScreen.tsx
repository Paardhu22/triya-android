import { Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Typography } from '@/components/Typography';
import { StatusBadge } from '@/components/StatusBadge';
import { useAction, useTenantProfile } from '@/hooks';
import { togglePaymentStatus, deleteTenant, sendRules } from '@/mocks/actions';
import { PAYMENT_STATUS_META } from '@/constants';
import { colors, spacing } from '@/theme';
import { formatFullDate, formatINR } from '@/utils';

export function TenantProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const { data: profile, isLoading, refetch } = useTenantProfile(id);
  const { busy: isToggling, run: runToggle } = useAction();
  const { busy: isDeleting, run: runDelete } = useAction();
  const { busy: isSendingRules, run: runSendRules } = useAction();

  if (isLoading || !profile) return null;

  const { tenant, active, stays, payments } = profile;

  const handleDelete = () => {
    Alert.alert('Delete Tenant', 'Are you sure you want to delete this tenant? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        runDelete(() => deleteTenant(tenant.id)).then(() => router.back());
      } },
    ]);
  };

  const handleSendRules = () => {
    runSendRules(() => sendRules(tenant.id)).then((res) => {
      if (res.ok) {
        Alert.alert('Success', `House rules sent to ${res.data.tenantName}`);
      } else {
        Alert.alert('Error', res.error);
      }
    });
  };

  const handleTogglePayment = () => {
    if (active) {
      runToggle(() => togglePaymentStatus(active.id)).then(() => refetch());
    }
  };

  return (
    <Screen edges={['bottom']} scrollable>
      <View style={styles.header}>
        <Avatar name={tenant.fullName} uri={tenant.photoUrl} size="lg" />
        <Typography variant="h2" style={styles.name}>{tenant.fullName}</Typography>
        <Typography variant="bodyMedium" color="textSecondary">{tenant.occupation || 'No occupation listed'}</Typography>
        <View style={styles.contact}>
          <Typography variant="captionMedium" color="textTertiary">{tenant.phone}</Typography>
          {tenant.email && (
            <Typography variant="captionMedium" color="textTertiary"> • {tenant.email}</Typography>
          )}
        </View>
      </View>

      {active && (
        <View style={styles.section}>
          <SectionHeader title="Active Stay" />
          <Card>
            <View style={styles.row}>
              <Typography variant="bodyMedium">Room {active.roomNumber} · Bed {active.bedLabel}</Typography>
              <StatusBadge meta={PAYMENT_STATUS_META[active.paymentStatus]} size="sm" />
            </View>
            <View style={styles.row}>
              <Typography variant="bodyMedium" color="textSecondary">Rent</Typography>
              <Typography variant="bodyMedium">{formatINR(active.monthlyRent)}/mo</Typography>
            </View>
            <View style={styles.row}>
              <Typography variant="bodyMedium" color="textSecondary">Check In</Typography>
              <Typography variant="bodyMedium">{formatFullDate(active.checkInDate)}</Typography>
            </View>
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader title="Actions" />
        <Card>
          {active && (
            <>
              <ListItem 
                title={active.paymentStatus === 'PAID' ? 'Mark Rent Unpaid' : 'Mark Rent Paid'} 
                icon="currency-inr" 
                onPress={handleTogglePayment} 
                disabled={isToggling}
              />
              <Divider style={{ marginVertical: 0 }} />
            </>
          )}
          <ListItem 
            title="Send House Rules" 
            icon="file-document-outline" 
            onPress={handleSendRules}
            disabled={isSendingRules}
          />
          <Divider style={{ marginVertical: 0 }} />
          <ListItem 
            title="Delete Tenant" 
            icon="delete-outline" 
            destructive 
            onPress={handleDelete}
            disabled={isDeleting}
          />
        </Card>
      </View>

      {stays.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Stays History" />
          <Card>
            {stays.map((stay, index) => (
              <View key={stay.id}>
                {index > 0 && <Divider verticalSpacing="md" />}
                <View style={styles.row}>
                  <Typography variant="bodyMedium">Room {stay.roomNumber} · Bed {stay.bedLabel}</Typography>
                  <Typography variant="captionMedium" color="textSecondary">{stay.status}</Typography>
                </View>
                <View style={styles.row}>
                  <Typography variant="caption" color="textTertiary">
                    {formatFullDate(stay.checkInDate)} - {stay.checkOutDate ? formatFullDate(stay.checkOutDate) : 'Present'}
                  </Typography>
                </View>
              </View>
            ))}
          </Card>
        </View>
      )}

      {payments.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Payments" />
          <Card>
            {payments.map((p, index) => (
              <View key={p.id}>
                {index > 0 && <Divider verticalSpacing="md" />}
                <View style={styles.row}>
                  <Typography variant="bodyMedium">{formatINR(p.amount)}</Typography>
                  <Typography variant="caption" color="textSecondary">{p.paidAt ? formatFullDate(p.paidAt) : ''}</Typography>
                </View>
                <Typography variant="caption" color="textTertiary">For {formatFullDate(p.forMonth)} • {p.method}</Typography>
              </View>
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  name: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  contact: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
});
