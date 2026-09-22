import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';

import {
  Avatar,
  Button,
  ConfirmDialog,
  Icon,
  KeyValue,
  ListRow,
  ProgressBar,
  Screen,
  SectionHeader,
  Skeleton,
  StatusBadge,
  Surface,
  Typography,
  enterHeader,
  enterItem,
  toast,
  type IconName,
} from '@/components';
import { COLLECTION_STATE_META, DEPOSIT_STATUS_META, PAYMENT_STATUS_META } from '@/constants';
import { useAction, useTenantProfile } from '@/hooks';
import { deleteTenant, sendRules } from '@/mocks';
import { CollectRentSheet } from '@/screens/collections/CollectRentSheet';
import { useActiveProperty } from '@/store';
import { borderRadius, colors, spacing, GUTTER } from '@/theme';
import type { Payment } from '@/types';
import {
  PAYMENT_METHOD_META,
  bedLocationLabel,
  formatDayMonth,
  formatFullDate,
  formatINR,
  formatMonthYear,
  ordinal,
  rentDueDate,
  rentDueText,
  startOfMonth,
} from '@/utils';

/**
 * TenantProfileScreen
 *
 * The web tenant profile on a phone: identity with the Current/Past marker,
 * this month's collection position with Collect Rent (the web replaced the
 * blunt paid/unpaid toggle with it), one-tap call / WhatsApp, KYC & personal
 * details, stay history with deposit and rent-cycle facts, every receipt in
 * the payment history, and the KYC document.
 */
export function TenantProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const property = useActiveProperty();
  const { data: profile, isLoading } = useTenantProfile(id);
  const { busy: isDeleting, run: runDelete } = useAction();
  const { busy: isSendingRules, run: runSendRules } = useAction();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);

  if (isLoading || !profile) {
    return (
      <Screen edges={['bottom']} background={colors.canvas}>
        <View style={styles.skeletons}>
          <View style={styles.skeletonHead}>
            <Skeleton width={64} height={64} radius={32} />
            <View style={styles.flex}>
              <Skeleton width="70%" height={22} />
              <Skeleton width="45%" height={12} style={styles.skeletonGap} />
            </View>
          </View>
          <Skeleton height={150} radius={borderRadius.lg} />
          <Skeleton height={200} radius={borderRadius.lg} />
        </View>
      </Screen>
    );
  }

  const { tenant, active, stays, payments } = profile;
  const isFlat = property.isFlat;
  const phoneDigits = tenant.phone.replace(/\D/g, '');

  const handleDelete = async () => {
    const res = await runDelete(() => deleteTenant(tenant.id));
    setDeleteOpen(false);
    if (res.ok) {
      toast.success(`${tenant.fullName} deleted`);
      router.back();
    } else toast.error(res.error);
  };

  const handleSendRules = async () => {
    const res = await runSendRules(() => sendRules(tenant.id));
    if (res.ok) toast.success('House rules sent', { description: `Sent to ${res.data.tenantName} on WhatsApp.` });
    else toast.error(res.error);
  };

  const kycRows: { label: string; value: string | null }[] = [
    { label: 'Email', value: tenant.email },
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

  const collectedPct =
    active && active.duePaise > 0 ? Math.round((active.collectedPaise / active.duePaise) * 100) : 100;

  return (
    <Screen edges={['bottom']} padded={false} background={colors.canvas}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <Animated.View entering={enterHeader()} style={styles.identity}>
          <Avatar name={tenant.fullName} uri={null} size="xl" />
          <View style={styles.identityText}>
            <Typography variant="h1" numberOfLines={2}>
              {tenant.fullName}
            </Typography>
            <View style={styles.markerRow}>
              {active ? (
                <StatusBadge meta={{ label: 'Current', color: colors.success, softColor: colors.successLight }} size="sm" />
              ) : (
                <StatusBadge meta={{ label: 'Past', color: colors.neutral, softColor: colors.neutralLight }} size="sm" />
              )}
              <Typography variant="small" color="textSecondary" numberOfLines={1}>
                {active
                  ? `${bedLocationLabel(active.roomNumber, active.bedLabel, isFlat)} · ${formatINR(active.monthlyRent)}/mo`
                  : tenant.phone}
              </Typography>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={enterItem(0)} style={styles.quick}>
          <QuickAction icon="phone-outline" label="Call" onPress={() => Linking.openURL(`tel:${phoneDigits}`)} />
          <QuickAction
            icon="whatsapp"
            label="WhatsApp"
            onPress={() => Linking.openURL(`https://wa.me/91${phoneDigits.slice(-10)}`)}
          />
          <QuickAction
            icon="file-document-outline"
            label="House rules"
            disabled={isSendingRules}
            onPress={handleSendRules}
          />
        </Animated.View>

        {/* This month */}
        {active && (
          <Animated.View entering={enterItem(1)}>
            <SectionHeader title={`Rent · ${formatMonthYear(new Date())}`} meta={rentDueText(active.state, active.paymentDueDay)} />
            <Surface padded style={styles.month}>
              <View style={styles.monthTop}>
                <Typography variant="h2" style={styles.tabular}>
                  {formatINR(active.collectedPaise)}{' '}
                  <Typography variant="caption" color="textSecondary">
                    of {formatINR(active.duePaise)} collected
                  </Typography>
                </Typography>
                <View style={styles.badges}>
                  <StatusBadge meta={COLLECTION_STATE_META[active.state]} size="sm" />
                  {active.paymentStatus === 'OVERDUE' && (
                    <StatusBadge meta={PAYMENT_STATUS_META.OVERDUE} size="sm" tinted />
                  )}
                </View>
              </View>
              <ProgressBar
                pct={collectedPct}
                color={active.state === 'PAID' ? colors.success : colors.chart1}
              />
              <Button title="Collect rent" icon="cash-plus" onPress={() => setCollectOpen(true)} />
            </Surface>
          </Animated.View>
        )}

        {/* Stay history */}
        <Animated.View entering={enterItem(2)}>
          <SectionHeader title="Stay history" meta={`${stays.length} ${stays.length === 1 ? 'stay' : 'stays'}`} />
          <Surface>
            {stays.length === 0 ? (
              <Typography variant="caption" color="textSecondary" style={styles.empty}>
                No stays recorded.
              </Typography>
            ) : (
              stays.map((stay, index) => (
                <ListRow
                  key={stay.id}
                  divider={index > 0}
                  icon={stay.status === 'ACTIVE' ? 'bed-outline' : 'history'}
                  title={bedLocationLabel(stay.roomNumber, stay.bedLabel, isFlat)}
                  subtitle={`${formatFullDate(stay.checkInDate)} – ${stay.checkOutDate ? formatFullDate(stay.checkOutDate) : 'Present'}`}
                  trailing={
                    <View style={styles.trailing}>
                      <Typography variant="numberSmall">{formatINR(stay.monthlyRent)}</Typography>
                      {stay.status === 'ACTIVE' ? (
                        <Typography variant="small" color="textTertiary">
                          Active
                        </Typography>
                      ) : (
                        <StatusBadge meta={DEPOSIT_STATUS_META[stay.depositStatus]} size="sm" />
                      )}
                    </View>
                  }
                />
              ))
            )}
            {active && (
              <View style={styles.facts}>
                <KeyValue
                  label="Deposit"
                  value={active.securityDeposit ? formatINR(active.securityDeposit) : 'Not set'}
                />
                <KeyValue
                  label="Rent cycle"
                  value={`${ordinal(rentDueDate(active.paymentDueDay, startOfMonth(new Date())).getDate())} of month`}
                  divider
                />
                {active.maintenanceCharge > 0 && (
                  <KeyValue label="Maintenance" value={`${formatINR(active.maintenanceCharge)}/mo`} divider />
                )}
                <KeyValue
                  label="Leaving"
                  value={active.expectedLeavingDate ? formatFullDate(active.expectedLeavingDate) : 'Not set'}
                  divider
                />
              </View>
            )}
          </Surface>
        </Animated.View>

        {/* Payment history */}
        <Animated.View entering={enterItem(3)}>
          <SectionHeader title="Payment history" meta={payments.length ? `${payments.length} receipts` : undefined} />
          <Surface>
            {payments.length === 0 ? (
              <Typography variant="caption" color="textSecondary" style={styles.empty}>
                No payments recorded.
              </Typography>
            ) : (
              payments.map((payment, index) => (
                <View key={payment.id} style={[styles.payment, index > 0 && styles.hairlineTop]}>
                  <View style={styles.flex}>
                    <Typography variant="bodyMedium">{formatMonthYear(payment.forMonth)}</Typography>
                    <Typography variant="small" color="textSecondary">
                      {payment.paidAt ? `Paid ${formatDayMonth(payment.paidAt)} · ${methodLabel(payment)}` : 'Not paid'}
                    </Typography>
                    {payment.recordedByName && (
                      <Typography variant="small" color="textTertiary">
                        Recorded by {payment.recordedByName}
                      </Typography>
                    )}
                  </View>
                  <Typography variant="number">{formatINR(payment.amount)}</Typography>
                </View>
              ))
            )}
          </Surface>
        </Animated.View>

        {/* KYC */}
        <Animated.View entering={enterItem(4)}>
          <SectionHeader title="KYC & personal details" />
          <Surface padded>
            <KeyValue label="Phone" value={tenant.phone} />
            {kycRows.map((row) => (
              <KeyValue key={row.label} label={row.label} value={row.value as string} divider />
            ))}
            {tenant.photoUrl && /^(https?|file):/.test(tenant.photoUrl) ? (
              <Image
                source={{ uri: tenant.photoUrl }}
                style={styles.kycImage}
                contentFit="contain"
                accessibilityLabel="KYC document"
              />
            ) : tenant.photoUrl ? (
              <View style={styles.kycFile}>
                <Icon name="card-account-details-outline" size={18} color={colors.success} />
                <Typography variant="small" color="textSecondary">
                  KYC photo on file — opens from the web app.
                </Typography>
              </View>
            ) : (
              <Typography variant="small" color="textTertiary" style={styles.kycNote}>
                No KYC document uploaded yet.
              </Typography>
            )}
          </Surface>
        </Animated.View>

        <Animated.View entering={enterItem(5)}>
          <Surface>
            <ListRow
              icon="delete-outline"
              title="Delete tenant"
              subtitle="Removes the tenant and their stay history"
              destructive
              hideChevron
              onPress={() => setDeleteOpen(true)}
              disabled={isDeleting}
            />
          </Surface>
        </Animated.View>
      </ScrollView>

      {active && (
        <CollectRentSheet visible={collectOpen} tenancyId={active.id} onClose={() => setCollectOpen(false)} />
      )}

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

function QuickAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.quickItem, pressed && styles.quickPressed, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={20} color={colors.text} />
      <Typography variant="smallMedium">{label}</Typography>
    </Pressable>
  );
}

function methodLabel(payment: Payment): string {
  if (payment.method === 'SPLIT') {
    return `${formatINR(payment.cashAmount ?? 0)} cash + ${formatINR(payment.onlineAmount ?? 0)} online`;
  }
  return PAYMENT_METHOD_META[payment.method].label;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  skeletons: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  skeletonHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonGap: {
    marginTop: spacing.sm,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityText: {
    flex: 1,
    gap: 6,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  quick: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: -spacing.sm,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  quickPressed: {
    backgroundColor: colors.surfacePressed,
  },
  disabled: {
    opacity: 0.5,
  },
  month: {
    gap: spacing.md,
  },
  monthTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tabular: {
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 3,
  },
  facts: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.canvas,
  },
  payment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  hairlineTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  kycImage: {
    width: '100%',
    aspectRatio: 16 / 10,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.canvas,
  },
  kycNote: {
    marginTop: spacing.sm,
  },
  kycFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.canvas,
  },
});
