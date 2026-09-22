import { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Avatar,
  BottomSheet,
  Button,
  ConfirmDialog,
  Icon,
  KeyValue,
  ProgressBar,
  StatusBadge,
  Typography,
  toast,
} from '@/components';
import { COLLECTION_STATE_META, PAYMENT_STATUS_META } from '@/constants';
import { useAction } from '@/hooks';
import { giveNotice, vacateBed, type FloorBed } from '@/mocks';
import { borderRadius, colors, spacing } from '@/theme';
import {
  bedLocationLabel,
  formatFullDate,
  formatINR,
  formatMonthYear,
  resolveDepositStatusOnVacate,
  vacateByDate,
  NOTICE_PERIOD_DAYS,
} from '@/utils';
import { CollectRentSheet } from '../collections/CollectRentSheet';
import { SendInvoiceSheet } from '../collections/SendInvoiceSheet';
import { AssignTenantForm } from './AssignTenantForm';

export interface BedSheetProps {
  bed: FloorBed | null;
  roomNumber: string;
  isFlat: boolean;
  visible: boolean;
  onClose: () => void;
}

/**
 * BedSheet
 *
 * Everything about one bed (the web's bed dialog, for touch). Occupied beds
 * show the tenant, this month's collection position and the actions —
 * Collect Rent (part payments welcome), send a bill, record notice, vacate
 * (deposit outcome follows the 15-day notice rule). Vacant beds open straight
 * into the check-in form.
 */
export function BedSheet({ bed, roomNumber, isFlat, visible, onClose }: BedSheetProps) {
  const router = useRouter();
  const { busy, run } = useAction();

  const [collectOpen, setCollectOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [noticeConfirmOpen, setNoticeConfirmOpen] = useState(false);
  const [vacateConfirmOpen, setVacateConfirmOpen] = useState(false);

  if (!bed) return null;
  const tenancy = bed.tenancy;
  const title = bedLocationLabel(roomNumber, bed.label, isFlat);

  // Deposit outcome preview if the tenant vacated right now (backend rule).
  const depositIfVacatedNow = tenancy
    ? resolveDepositStatusOnVacate(tenancy.noticeGivenDate, new Date())
    : null;

  async function onGiveNotice() {
    if (!tenancy) return;
    const result = await run(() => giveNotice(tenancy.id));
    setNoticeConfirmOpen(false);
    if (result.ok) {
      toast.success('Notice recorded', {
        description: `Vacate by ${formatFullDate(result.data.vacateBy)}.`,
      });
    } else toast.error(result.error);
  }

  async function onVacate() {
    if (!tenancy) return;
    const result = await run(() => vacateBed(tenancy.id));
    setVacateConfirmOpen(false);
    if (result.ok) {
      toast.success(`${isFlat ? 'Flat' : 'Bed'} vacated`, {
        description: `Deposit marked ${result.data.depositStatus.toLowerCase()}. The stay is kept in history.`,
      });
      onClose();
    } else toast.error(result.error);
  }

  const collectedPct =
    tenancy && tenancy.duePaise > 0
      ? Math.round((tenancy.collectedPaise / tenancy.duePaise) * 100)
      : 100;

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={title}
        subtitle={tenancy ? 'Occupied' : 'Vacant — check a tenant in'}
      >
        {tenancy ? (
          <View style={styles.body}>
            {/* Tenant */}
            <Pressable
              onPress={() => {
                onClose();
                router.push(`/(main)/tenants/${tenancy.tenant.id}` as never);
              }}
              style={({ pressed }) => [styles.tenantRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${tenancy.tenant.fullName}'s profile`}
            >
              <Avatar name={tenancy.tenant.fullName} uri={null} size="lg" />
              <View style={styles.tenantText}>
                <Typography variant="h3" numberOfLines={1}>
                  {tenancy.tenant.fullName}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {tenancy.tenant.phone} · since {formatFullDate(tenancy.checkInDate)}
                </Typography>
              </View>
              <Icon name="chevron-right" size={22} color={colors.textTertiary} />
            </Pressable>

            {/* This month */}
            <View style={styles.month}>
              <View style={styles.monthTop}>
                <Typography variant="overline" color="textSecondary">
                  {formatMonthYear(new Date())}
                </Typography>
                <View style={styles.badges}>
                  <StatusBadge meta={COLLECTION_STATE_META[tenancy.state]} size="sm" />
                  {tenancy.paymentStatus === 'OVERDUE' && (
                    <StatusBadge meta={PAYMENT_STATUS_META.OVERDUE} size="sm" tinted />
                  )}
                </View>
              </View>
              <Typography variant="h2" style={styles.tabular}>
                {formatINR(tenancy.collectedPaise)}{' '}
                <Typography variant="caption" color="textSecondary">
                  of {formatINR(tenancy.duePaise)} collected
                </Typography>
              </Typography>
              <ProgressBar
                pct={collectedPct}
                color={tenancy.state === 'PAID' ? colors.success : colors.chart1}
              />
            </View>

            <View style={styles.facts}>
              <KeyValue label="Monthly rent" value={`${formatINR(tenancy.monthlyRent)}/mo`} />
              {tenancy.maintenanceCharge > 0 && (
                <KeyValue
                  label="Maintenance"
                  value={`${formatINR(tenancy.maintenanceCharge)}/mo`}
                  divider
                />
              )}
              <KeyValue
                label="Security deposit"
                value={tenancy.securityDeposit ? formatINR(tenancy.securityDeposit) : 'Not set'}
                divider
              />
            </View>

            {tenancy.noticeGivenDate && tenancy.expectedLeavingDate ? (
              <View style={styles.noticeBox}>
                <Icon name="calendar-alert" size={16} color={colors.warning} />
                <Typography variant="small" style={styles.noticeText}>
                  Notice given {formatFullDate(tenancy.noticeGivenDate)} — vacating by{' '}
                  <Typography variant="smallMedium">
                    {formatFullDate(tenancy.expectedLeavingDate)}
                  </Typography>
                  .
                </Typography>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                title={
                  tenancy.state === 'PAID'
                    ? 'Collect rent'
                    : `Collect rent · ${formatINR(tenancy.duePaise - tenancy.collectedPaise)} due`
                }
                icon="cash-plus"
                onPress={() => setCollectOpen(true)}
              />
              <View style={styles.actionRow}>
                <Button
                  title="Send invoice"
                  icon="receipt"
                  variant="outline"
                  style={styles.flex}
                  onPress={() => setInvoiceOpen(true)}
                />
                {!tenancy.noticeGivenDate && (
                  <Button
                    title="Record notice"
                    icon="calendar-clock"
                    variant="outline"
                    style={styles.flex}
                    onPress={() => setNoticeConfirmOpen(true)}
                  />
                )}
              </View>
              <Button
                title={isFlat ? 'Vacate flat' : 'Vacate bed'}
                icon="exit-to-app"
                variant="ghost"
                textColor={colors.error}
                onPress={() => setVacateConfirmOpen(true)}
              />
            </View>
          </View>
        ) : (
          <AssignTenantForm bedId={bed.id} onDone={onClose} />
        )}
      </BottomSheet>

      {/* Flows */}
      {tenancy && (
        <>
          <CollectRentSheet
            visible={collectOpen}
            tenancyId={tenancy.id}
            onClose={() => setCollectOpen(false)}
          />
          <SendInvoiceSheet
            visible={invoiceOpen}
            tenancyId={tenancy.id}
            isFlat={isFlat}
            onClose={() => setInvoiceOpen(false)}
          />
          <ConfirmDialog
            visible={noticeConfirmOpen}
            title="Record notice"
            message={`Record that ${tenancy.tenant.fullName} gave notice today? The vacate-by date will be ${formatFullDate(vacateByDate(new Date()))} (${NOTICE_PERIOD_DAYS} days).`}
            confirmLabel="Record notice"
            loading={busy}
            onConfirm={onGiveNotice}
            onCancel={() => setNoticeConfirmOpen(false)}
          />
          <ConfirmDialog
            visible={vacateConfirmOpen}
            title={isFlat ? 'Vacate flat' : 'Vacate bed'}
            message={
              `End ${tenancy.tenant.fullName}'s stay and free this ${isFlat ? 'flat' : 'bed'}? ` +
              `Based on the ${NOTICE_PERIOD_DAYS}-day notice rule, the deposit will be marked ` +
              `${depositIfVacatedNow === 'REFUNDABLE' ? 'refundable' : 'forfeited'}. The stay is kept in history.`
            }
            confirmLabel="Vacate"
            destructive
            loading={busy}
            onConfirm={onVacate}
            onCancel={() => setVacateConfirmOpen(false)}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  pressed: {
    opacity: 0.7,
  },
  tenantText: {
    flex: 1,
    gap: 2,
  },
  month: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.canvas,
  },
  monthTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  facts: {
    paddingHorizontal: 2,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warningLight,
  },
  noticeText: {
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
