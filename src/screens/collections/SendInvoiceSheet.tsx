import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import {
  BottomSheet,
  Button,
  Divider,
  Icon,
  TextInput,
  Typography,
} from '@/components';
import { useAction } from '@/hooks';
import { getInvoiceDraftContext, sendInvoice } from '@/mocks';
import { colors, spacing, borderRadius } from '@/theme';
import {
  bedLocationLabel,
  computeInvoiceTotals,
  defaultBillingMonth,
  defaultDueDate,
  formatFullDate,
  formatINR,
  formatMonthYear,
  rupeesToPaise,
} from '@/utils';

export interface SendInvoiceSheetProps {
  visible: boolean;
  tenancyId: string | null;
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
 * The mobile version of the web's invoice preview dialog: rent and
 * maintenance come from the tenancy, staff can add previous dues, extra
 * charges, a discount and notes, and the totals are computed with the same
 * shared math the backend uses (subtotal = rent + maintenance + previous +
 * extra; total = subtotal − discount, floored at zero).
 */
export function SendInvoiceSheet({ visible, tenancyId, isFlat, onClose }: SendInvoiceSheetProps) {
  const { busy, run } = useAction();

  const context = useMemo(
    () => (tenancyId ? getInvoiceDraftContext(tenancyId) : null),
    [tenancyId],
  );

  const [previousDue, setPreviousDue] = useState('');
  const [extraCharges, setExtraCharges] = useState('');
  const [extraLabel, setExtraLabel] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentNumber, setSentNumber] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPreviousDue('');
      setExtraCharges('');
      setExtraLabel('');
      setDiscount('');
      setNotes('');
      setError(null);
      setSentNumber(null);
    }
  }, [visible, tenancyId]);

  if (!context) return null;

  const charges = {
    rentPaise: context.rentPaise,
    maintenancePaise: context.maintenancePaise,
    previousDuePaise: parseRupees(previousDue),
    extraChargesPaise: parseRupees(extraCharges),
    discountPaise: parseRupees(discount),
  };
  const { subtotalPaise, totalPaise } = computeInvoiceTotals(charges);
  const billingMonth = defaultBillingMonth();
  const dueDate = defaultDueDate(context.paymentDueDay, billingMonth);

  async function onSend() {
    if (!tenancyId) return;
    setError(null);
    const result = await run(() =>
      sendInvoice({
        tenancyId,
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
    setSentNumber(result.data.number);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Send invoice">
      {sentNumber ? (
        <View style={styles.sentBox}>
          <View style={styles.sentIcon}>
            <Icon name="check-circle" size={34} color={colors.success} />
          </View>
          <Typography variant="h3">Invoice sent</Typography>
          <Typography variant="caption" color="textSecondary" style={styles.centered}>
            {sentNumber} ({formatINR(totalPaise)}) was sent to {context.tenantName} on
            WhatsApp.
          </Typography>
          <Button title="Done" onPress={onClose} style={styles.doneButton} />
        </View>
      ) : (
        <View style={styles.form}>
          <Typography variant="caption" color="textSecondary">
            {context.tenantName} ·{' '}
            {bedLocationLabel(context.roomNumber, context.bedLabel, isFlat)} · Billing{' '}
            {formatMonthYear(billingMonth)}
          </Typography>

          <View style={styles.fieldRow}>
            <TextInput
              label="Previous due (₹)"
              placeholder="0"
              keyboardType="numeric"
              value={previousDue}
              onChangeText={setPreviousDue}
              style={styles.flexInput}
            />
          </View>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <TextInput
                label="Extra charges (₹)"
                placeholder="0"
                keyboardType="numeric"
                value={extraCharges}
                onChangeText={setExtraCharges}
              />
            </View>
            <View style={styles.col}>
              <TextInput
                label="Extra label"
                placeholder="e.g. Electricity"
                value={extraLabel}
                onChangeText={setExtraLabel}
              />
            </View>
          </View>
          <TextInput
            label="Discount (₹)"
            placeholder="0"
            keyboardType="numeric"
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
            <PreviewRow label="Rent" value={formatINR(charges.rentPaise)} />
            {charges.maintenancePaise > 0 && (
              <PreviewRow label="Maintenance" value={formatINR(charges.maintenancePaise)} />
            )}
            {charges.previousDuePaise > 0 && (
              <PreviewRow label="Previous due" value={formatINR(charges.previousDuePaise)} />
            )}
            {charges.extraChargesPaise > 0 && (
              <PreviewRow
                label={extraLabel.trim() || 'Extra charges'}
                value={formatINR(charges.extraChargesPaise)}
              />
            )}
            {charges.discountPaise > 0 && (
              <PreviewRow label="Discount" value={`− ${formatINR(charges.discountPaise)}`} />
            )}
            <Divider verticalSpacing="xs" />
            <PreviewRow label="Subtotal" value={formatINR(subtotalPaise)} />
            <View style={styles.previewRow}>
              <Typography variant="bodyMedium">Total</Typography>
              <Typography variant="h3">{formatINR(totalPaise)}</Typography>
            </View>
            <Typography variant="small" color="textTertiary">
              Due {formatFullDate(dueDate)}
            </Typography>
          </View>

          {error && (
            <Typography variant="caption" colorValue={colors.error}>
              {error}
            </Typography>
          )}

          <Button
            title="Send on WhatsApp"
            icon="whatsapp"
            loading={busy}
            onPress={onSend}
          />
        </View>
      )}
    </BottomSheet>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewRow}>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="captionMedium">{value}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
  },
  flexInput: {
    flex: 1,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  col: {
    flex: 1,
  },
  preview: {
    gap: spacing.xs + 2,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sentBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  sentIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  doneButton: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});
