import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import {
  BottomSheet,
  Button,
  Icon,
  KeyValue,
  TextInput,
  Typography,
  toast,
} from '@/components';
import { useAction } from '@/hooks';
import { getInvoiceDraftContext, sendInvoice } from '@/mocks';
import { borderRadius, colors, spacing } from '@/theme';
import {
  bedLocationLabel,
  computeInvoiceTotals,
  defaultDueDate,
  formatFullDate,
  formatINR,
  formatMonthYear,
  invoiceBalancePaise,
  invoiceStatusLabel,
  monthFromKey,
  paiseToRupees,
  rupeesToPaise,
} from '@/utils';

export interface SendInvoiceSheetProps {
  visible: boolean;
  tenancyId: string | null;
  /** Billing month (YYYY-MM); the current month when omitted. */
  month?: string;
  isFlat: boolean;
  onClose: () => void;
}

function parseRupees(text: string): number {
  const value = Number.parseFloat(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? rupeesToPaise(value) : 0;
}

/**
 * SendInvoiceSheet
 *
 * The web's invoice preview dialog: a bill sent BEFORE payment (recording a
 * collection issues its own invoice). Rent and maintenance come from the
 * tenancy; previous due defaults to the unpaid balance from earlier months;
 * staff can add extra charges, a discount and notes. Totals use the shared
 * math (subtotal − discount, floored at zero) and show what the month has
 * already collected against them.
 */
export function SendInvoiceSheet({ visible, tenancyId, month, isFlat, onClose }: SendInvoiceSheetProps) {
  const { busy, run } = useAction();

  const context = useMemo(
    () => (visible && tenancyId ? getInvoiceDraftContext(tenancyId, month) : null),
    [visible, tenancyId, month],
  );

  const [previousDue, setPreviousDue] = useState('');
  const [extraCharges, setExtraCharges] = useState('');
  const [extraLabel, setExtraLabel] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPreviousDue(
      context && context.previousDuePaise > 0 ? String(paiseToRupees(context.previousDuePaise)) : '',
    );
    setExtraCharges('');
    setExtraLabel('');
    setDiscount('');
    setNotes('');
    setError(null);
  }, [visible, context]);

  if (!context) return null;

  const charges = {
    rentPaise: context.rentPaise,
    maintenancePaise: context.maintenancePaise,
    previousDuePaise: parseRupees(previousDue),
    extraChargesPaise: parseRupees(extraCharges),
    discountPaise: parseRupees(discount),
  };
  const { subtotalPaise, totalPaise } = computeInvoiceTotals(charges);
  const billingMonth = monthFromKey(context.month);
  const dueDate = defaultDueDate(context.paymentDueDay, billingMonth);
  const balance = invoiceBalancePaise(totalPaise, context.paidPaise);
  const statusLabel = invoiceStatusLabel({
    totalPaise,
    paidPaise: context.paidPaise,
    dueLabel: new Date() > dueDate ? 'Overdue' : 'Pending',
  });

  async function onSend() {
    if (!tenancyId) return;
    setError(null);
    const result = await run(() =>
      sendInvoice({
        tenancyId,
        billingMonth: context?.month,
        previousDuePaise: charges.previousDuePaise,
        extraChargesPaise: charges.extraChargesPaise,
        extraChargesLabel: charges.extraChargesPaise > 0 ? extraLabel.trim() || null : null,
        discountPaise: charges.discountPaise,
        notes: notes.trim() || null,
      }),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success('Invoice sent', {
      description: `${result.data.number} (${formatINR(totalPaise)}) sent to ${context?.tenantName} on WhatsApp.`,
    });
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Send invoice"
      subtitle={`${context.tenantName} · ${bedLocationLabel(context.roomNumber, context.bedLabel, isFlat)}`}
      footer={
        <Button
          title={`Send ${formatINR(totalPaise)} on WhatsApp`}
          icon="whatsapp"
          loading={busy}
          onPress={onSend}
        />
      }
    >
      <View style={styles.form}>
        <View style={styles.billing}>
          <Icon name="calendar-month-outline" size={16} color={colors.textSecondary} />
          <Typography variant="small" color="textSecondary">
            Billing {formatMonthYear(billingMonth)} · due {formatFullDate(dueDate)}
          </Typography>
        </View>

        <TextInput
          label="Previous due"
          prefix="₹"
          placeholder="0"
          keyboardType="decimal-pad"
          value={previousDue}
          onChangeText={setPreviousDue}
          hint={
            context.previousDuePaise > 0
              ? `Unpaid from earlier months: ${formatINR(context.previousDuePaise)}`
              : undefined
          }
        />
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <TextInput
              label="Extra charges"
              prefix="₹"
              placeholder="0"
              keyboardType="decimal-pad"
              value={extraCharges}
              onChangeText={setExtraCharges}
            />
          </View>
          <View style={styles.col}>
            <TextInput
              label="Label"
              placeholder="e.g. Electricity"
              value={extraLabel}
              onChangeText={setExtraLabel}
            />
          </View>
        </View>
        <TextInput
          label="Discount"
          prefix="₹"
          placeholder="0"
          keyboardType="decimal-pad"
          value={discount}
          onChangeText={setDiscount}
        />
        <TextInput
          label="Notes"
          placeholder="Shown on the invoice"
          value={notes}
          onChangeText={setNotes}
        />

        {/* Live preview — identical math to the backend */}
        <View style={styles.preview}>
          <Typography variant="overline" color="textSecondary" style={styles.previewTitle}>
            Invoice preview
          </Typography>
          <KeyValue label="Rent" value={formatINR(charges.rentPaise)} />
          {charges.maintenancePaise > 0 && (
            <KeyValue label="Maintenance" value={formatINR(charges.maintenancePaise)} />
          )}
          {charges.previousDuePaise > 0 && (
            <KeyValue label="Previous due" value={formatINR(charges.previousDuePaise)} />
          )}
          {charges.extraChargesPaise > 0 && (
            <KeyValue
              label={extraLabel.trim() || 'Extra charges'}
              value={formatINR(charges.extraChargesPaise)}
            />
          )}
          {charges.discountPaise > 0 && (
            <KeyValue label="Discount" value={`− ${formatINR(charges.discountPaise)}`} />
          )}
          <KeyValue label="Subtotal" value={formatINR(subtotalPaise)} divider />
          <KeyValue label="Total" value={formatINR(totalPaise)} strong />
          {context.paidPaise > 0 && (
            <>
              <KeyValue label="Paid so far" value={`− ${formatINR(context.paidPaise)}`} />
              <KeyValue label="Balance due" value={formatINR(balance)} strong divider />
            </>
          )}
          <Typography variant="small" color="textTertiary">
            Status on the invoice: {statusLabel}
          </Typography>
        </View>

        {error && (
          <Typography variant="caption" colorValue={colors.error}>
            {error}
          </Typography>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  billing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  col: {
    flex: 1,
  },
  preview: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.canvas,
  },
  previewTitle: {
    marginBottom: 2,
  },
});
