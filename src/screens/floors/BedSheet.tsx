import { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Avatar,
  BottomSheet,
  Button,
  ConfirmDialog,
  Divider,
  Icon,
  StatusBadge,
  Typography,
} from '@/components';
import { PAYMENT_STATUS_META } from '@/constants';
import { useAction } from '@/hooks';
import { giveNotice, vacateBed, type FloorBed } from '@/mocks';
import { colors, spacing, borderRadius } from '@/theme';
import {
  bedLocationLabel,
  currentCycleDuePaise,
  formatFullDate,
  formatINR,
  resolveDepositStatusOnVacate,
  vacateByDate,
  NOTICE_PERIOD_DAYS,
} from '@/utils';
import { MarkPaidFlow } from '../collections/MarkPaidFlow';
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
 * Everything about one bed, in a bottom sheet (the web's bed dialog,
 * redesigned for touch). Occupied beds show the tenant with the rent-cycle
 * actions — mark paid, send invoice, give notice, vacate (deposit outcome
 * follows the 15-day notice rule). Vacant beds open straight into the
 * check-in form, the primary floor-manager workflow.
 */
export function BedSheet({ bed, roomNumber, isFlat, visible, onClose }: BedSheetProps) {
  const router = useRouter();
  const { busy, run } = useAction();

  const [markPaidOpen, setMarkPaidOpen] = useState(false);
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
    if (result.ok) setNoticeConfirmOpen(false);
  }

  async function onVacate() {
    if (!tenancy) return;
    const result = await run(() => vacateBed(tenancy.id));
    if (result.ok) {
      setVacateConfirmOpen(false);
      onClose();
    }
  }

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={title}>
        {tenancy ? (
          <View style={styles.body}>
            {/* Tenant */}
            <Pressable
              onPress={() => {
                onClose();
                router.push(`/(main)/tenants/${tenancy.tenant.id}` as any);
              }}
              style={({ pressed }) => [styles.tenantRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${tenancy.tenant.fullName}'s profile`}
            >
              <Avatar name={tenancy.tenant.fullName} size="lg" />
              <View style={styles.tenantText}>
                <Typography variant="bodyMedium" numberOfLines={1}>
                  {tenancy.tenant.fullName}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {tenancy.tenant.phone}
                </Typography>
                <Typography variant="small" colorValue={colors.primary}>
                  View full profile
                </Typography>
              </View>
              <Icon name="chevron-right" size={22} color={colors.textTertiary} />
            </Pressable>

            <Divider verticalSpacing="xs" />

            {/* Tenancy facts */}
            <InfoRow label="Monthly rent" value={`${formatINR(tenancy.monthlyRent)}/mo`} />
            {tenancy.maintenanceCharge > 0 && (
              <InfoRow label="Maintenance" value={`${formatINR(tenancy.maintenanceCharge)}/mo`} />
            )}
            <InfoRow
              label="Security deposit"
              value={tenancy.securityDeposit ? formatINR(tenancy.securityDeposit) : 'Not set'}
            />
            <InfoRow label="Check-in" value={formatFullDate(tenancy.checkInDate)} />
            <View style={styles.infoRow}>
              <Typography variant="caption" color="textSecondary">
                This cycle
              </Typography>
              <StatusBadge meta={PAYMENT_STATUS_META[tenancy.paymentStatus]} size="sm" />
            </View>

            {/* Notice */}
            {tenancy.noticeGivenDate && tenancy.expectedLeavingDate ? (
              <View style={styles.noticeBox}>
                <Icon name="calendar-alert" size={16} color={colors.warning} />
                <Typography variant="small" colorValue={colors.warning} style={styles.noticeText}>
                  Notice given {formatFullDate(tenancy.noticeGivenDate)} — vacating by{' '}
                  {formatFullDate(tenancy.expectedLeavingDate)}.
                </Typography>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actions}>
              {tenancy.paymentStatus !== 'PAID' && (
                <Button
                  title={`Mark Paid — ${formatINR(currentCycleDuePaise(tenancy))}`}
                  icon="check-circle-outline"
                  onPress={() => setMarkPaidOpen(true)}
                />
              )}
              <Button
                title="Send invoice"
                icon="receipt"
                variant="secondary"
                onPress={() => setInvoiceOpen(true)}
              />
              {!tenancy.noticeGivenDate && (
                <Button
                  title="Record notice"
                  icon="calendar-clock"
                  variant="outline"
                  onPress={() => setNoticeConfirmOpen(true)}
                />
              )}
              <Button
                title={isFlat ? 'Vacate flat' : 'Vacate bed'}
                icon="exit-to-app"
                variant="outline"
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
          <MarkPaidFlow
            visible={markPaidOpen}
            tenancyId={tenancy.id}
            tenantName={tenancy.tenant.fullName}
            amountPaise={currentCycleDuePaise(tenancy)}
            isFlat={isFlat}
            onClose={() => setMarkPaidOpen(false)}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="captionMedium">{value}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.sm + 2,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  tenantText: {
    flex: 1,
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
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
    marginTop: spacing.sm,
  },
});
