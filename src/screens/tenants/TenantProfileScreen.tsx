import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Divider } from '@/components/Divider';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { Typography } from '@/components/Typography';
import { enterHeader, enterItem } from '@/components/motion';
import { useAction, useTenantProfile } from '@/hooks';
import { togglePaymentStatus, deleteTenant, sendRules } from '@/mocks/actions';
import type { Payment } from '@/types';
import { PAYMENT_STATUS_META } from '@/constants';
import { useActiveProperty } from '@/store';
import { colors, spacing, borderRadius } from '@/theme';
import {
  bedLocationLabel,
  currentCycleDuePaise,
  formatDayMonth,
  formatFullDate,
  formatINR,
  formatMonthYear,
  ordinal,
  rentDueText,
} from '@/utils';

/**
 * TenantProfileScreen
 *
 * The web tenant profile page on mobile: identity header with the
 * Current/Past marker, quick actions (toggle cycle payment, send house
 * rules, delete), KYC & personal details, stay history with the active
 * stay's deposit/cycle/leaving facts, payment history with method and
 * recorder, and the KYC document.
 */
export function TenantProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const property = useActiveProperty();

  const { data: profile, isLoading, refetch } = useTenantProfile(id);
  const { busy: isToggling, run: runToggle } = useAction();
  const { busy: isDeleting, run: runDelete } = useAction();
  const { busy: isSendingRules, run: runSendRules } = useAction();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (isLoading || !profile) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.skeletons}>
          <Skeleton height={120} radius={16} />
          <Skeleton height={160} radius={12} />
          <Skeleton height={160} radius={12} />
        </View>
      </Screen>
    );
  }

  const { tenant, active, stays, payments } = profile;
  const isFlat = property.isFlat;

  const handleDelete = async () => {
    const res = await runDelete(() => deleteTenant(tenant.id));
    setDeleteOpen(false);
    if (res.ok) router.back();
    else setFeedback(res.error);
  };

  const handleSendRules = async () => {
    const res = await runSendRules(() => sendRules(tenant.id));
    setFeedback(res.ok ? `House rules sent to ${res.data.tenantName} on WhatsApp.` : res.error);
  };

  const handleTogglePayment = async () => {
    if (!active) return;
    const res = await runToggle(() => togglePaymentStatus(active.id));
    if (res.ok) {
      setFeedback(null);
      refetch();
    } else {
      setFeedback(res.error);
    }
  };

  const kycRows: { label: string; value: string | null }[] = [
    { label: "Father's name", value: tenant.fatherName },
    { label: "Mother's name", value: tenant.motherName },
    { label: 'Emergency contact', value: tenant.emergencyContact },
    { label: 'Aadhaar', value: tenant.aadhaarNumber },
    { label: 'PAN', value: tenant.panNumber },
    { label: 'Occupation', value: tenant.occupation },
    { label: 'College', value: tenant.college },
    { label: 'Company', value: tenant.company },
    { label: 'Address', value: tenant.address },
    { label: 'Notes', value: tenant.notes },
  ].filter((row) => Boolean(row.value));

  return (
    <Screen edges={['bottom']} scrollable>
      {/* Identity header */}
      <Animated.View entering={enterHeader()} style={styles.header}>
        <Avatar name={tenant.fullName} uri={tenant.photoUrl} size="xl" />
        <View style={styles.nameRow}>
          <Typography variant="h2">{tenant.fullName}</Typography>
          {active ? (
            <View style={styles.currentTag}>
              <View style={styles.currentDot} />
              <Typography variant="small">Current</Typography>
            </View>
          ) : (
            <Typography variant="small" color="textTertiary">
              Past
            </Typography>
          )}
        </View>
        <Typography variant="caption" color="textSecondary">
          {tenant.phone}
          {tenant.email ? ` · ${tenant.email}` : ''}
        </Typography>
        {active && (
          <Typography variant="caption" color="textSecondary">
            {bedLocationLabel(active.roomNumber, active.bedLabel, isFlat)} ·{' '}
            {formatINR(active.monthlyRent)}/mo
          </Typography>
        )}
      </Animated.View>

      {feedback && (
        <View style={styles.feedback}>
          <Typography variant="caption" color="textSecondary" style={styles.feedbackText}>
            {feedback}
          </Typography>
        </View>
      )}

      {/* Actions */}
      <Animated.View entering={enterItem(0)} style={styles.section}>
        <SectionHeader title="Actions" />
        <Card flat noPadding>
          {active && (
            <>
              <ListItem
                title={
                  active.paymentStatus === 'PAID'
                    ? 'Mark rent unpaid'
                    : `Mark rent paid — ${formatINR(currentCycleDuePaise(active))}`
                }
                icon="currency-inr"
                onPress={handleTogglePayment}
                disabled={isToggling}
              />
              <Divider style={styles.zeroDivider} />
            </>
          )}
          <ListItem
            title="Send house rules"
            icon="file-document-outline"
            onPress={handleSendRules}
            disabled={isSendingRules}
          />
          <Divider style={styles.zeroDivider} />
          <ListItem
            title="Delete tenant"
            icon="delete-outline"
            destructive
            onPress={() => setDeleteOpen(true)}
            disabled={isDeleting}
          />
        </Card>
      </Animated.View>

      {/* KYC & personal details */}
      <Animated.View entering={enterItem(1)} style={styles.section}>
        <SectionHeader title="KYC & personal details" />
        <Card flat>
          {kycRows.length === 0 ? (
            <Typography variant="caption" color="textSecondary">
              No additional KYC details captured yet.
            </Typography>
          ) : (
            kycRows.map((row, index) => (
              <View key={row.label}>
                {index > 0 && <Divider style={styles.zeroDivider} />}
                <View style={styles.infoRow}>
                  <Typography variant="caption" color="textSecondary">
                    {row.label}
                  </Typography>
                  <Typography variant="captionMedium" style={styles.infoValue}>
                    {row.value}
                  </Typography>
                </View>
              </View>
            ))
          )}
        </Card>
      </Animated.View>

      {/* Stay history */}
      <Animated.View entering={enterItem(2)} style={styles.section}>
        <SectionHeader title="Stay history" />
        <Card flat>
          {stays.length === 0 ? (
            <Typography variant="caption" color="textSecondary">
              No stays recorded.
            </Typography>
          ) : (
            <>
              {stays.map((stay, index) => (
                <View key={stay.id}>
                  {index > 0 && <Divider verticalSpacing="sm" />}
                  <View style={styles.row}>
                    <View style={styles.rowText}>
                      <Typography variant="captionMedium">
                        {bedLocationLabel(stay.roomNumber, stay.bedLabel, isFlat)}
                      </Typography>
                      <Typography variant="small" color="textTertiary">
                        {formatFullDate(stay.checkInDate)} –{' '}
                        {stay.checkOutDate ? formatFullDate(stay.checkOutDate) : 'Present'}
                      </Typography>
                    </View>
                    <View style={styles.rowRight}>
                      <Typography variant="captionMedium">
                        {formatINR(stay.monthlyRent)}
                      </Typography>
                      <Typography variant="small" color="textTertiary">
                        {stay.status === 'ACTIVE' ? 'Active' : 'Ended'}
                      </Typography>
                    </View>
                  </View>
                </View>
              ))}
              {active && (
                <>
                  <Divider verticalSpacing="sm" />
                  <View style={styles.stayFacts}>
                    <Typography variant="small" color="textSecondary">
                      Deposit:{' '}
                      {active.securityDeposit ? formatINR(active.securityDeposit) : 'Not set'}
                    </Typography>
                    <Typography variant="small" color="textSecondary">
                      Rent cycle: {ordinal(active.paymentDueDay || 5)} of month ·{' '}
                      {rentDueText(active.paymentStatus, active.paymentDueDay)}
                    </Typography>
                    <Typography variant="small" color="textSecondary">
                      Leaving:{' '}
                      {active.expectedLeavingDate
                        ? formatFullDate(active.expectedLeavingDate)
                        : 'Not set'}
                    </Typography>
                  </View>
                </>
              )}
            </>
          )}
        </Card>
      </Animated.View>

      {/* Payment history */}
      <Animated.View entering={enterItem(3)} style={styles.section}>
        <SectionHeader title="Payment history" />
        <Card flat>
          {payments.length === 0 ? (
            <Typography variant="caption" color="textSecondary">
              No payments recorded.
            </Typography>
          ) : (
            payments.map((payment, index) => (
              <View key={payment.id}>
                {index > 0 && <Divider verticalSpacing="sm" />}
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Typography variant="captionMedium">
                      {formatMonthYear(payment.forMonth)}
                    </Typography>
                    <Typography variant="small" color="textTertiary">
                      {payment.paidAt
                        ? `Paid ${formatDayMonth(payment.paidAt)} by ${paymentMethodLabel(payment)}`
                        : 'Not paid'}
                    </Typography>
                    {payment.recordedByName && (
                      <Typography variant="small" color="textTertiary">
                        Recorded by {payment.recordedByName}
                      </Typography>
                    )}
                  </View>
                  <View style={styles.rowRight}>
                    <Typography variant="captionMedium">
                      {formatINR(payment.amount)}
                    </Typography>
                    <StatusBadge meta={PAYMENT_STATUS_META[payment.status]} size="sm" />
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>
      </Animated.View>

      {/* KYC document */}
      <Animated.View entering={enterItem(4)} style={styles.section}>
        <SectionHeader title="KYC document" />
        <Card flat>
          {tenant.photoUrl ? (
            <Image
              source={{ uri: tenant.photoUrl }}
              style={styles.kycImage}
              contentFit="contain"
              accessibilityLabel="KYC document"
            />
          ) : (
            <Typography variant="caption" color="textSecondary">
              No KYC document uploaded yet.
            </Typography>
          )}
        </Card>
      </Animated.View>

      <ConfirmDialog
        visible={deleteOpen}
        title="Delete tenant"
        message={`Delete ${tenant.fullName} and their stay history? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Screen>
  );
}

function paymentMethodLabel(payment: Payment): string {
  if (payment.method === 'SPLIT') {
    const cash = payment.cashAmount ? formatINR(payment.cashAmount) : '₹0';
    const online = payment.onlineAmount ? formatINR(payment.onlineAmount) : '₹0';
    return `split (cash ${cash}, online ${online})`;
  }
  return payment.method.toLowerCase();
}

const styles = StyleSheet.create({
  skeletons: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  currentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
  },
  feedback: {
    marginBottom: spacing.md,
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  feedbackText: {
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  zeroDivider: {
    marginVertical: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stayFacts: {
    gap: 3,
  },
  kycImage: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
});
