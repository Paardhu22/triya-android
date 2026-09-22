import { Pressable, View, StyleSheet } from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import { Typography } from '@/components/Typography';
import { INVOICE_STATUS_META } from '@/constants';
import type { InvoiceHistoryRow } from '@/mocks';
import { colors, spacing } from '@/theme';
import {
  bedLocationShort,
  formatFullDate,
  formatINR,
  formatShortMonthYear,
  invoiceBalancePaise,
} from '@/utils';

export interface InvoiceCardProps {
  invoice: InvoiceHistoryRow;
  isFlat: boolean;
  onPress: () => void;
}

/**
 * InvoiceCard — one Invoice History row (web invoice-history table): number
 * and what it was for (a payment of ₹X, or a bill), tenant · unit · month,
 * total / paid / balance, and the delivery status with the failure reason.
 */
export function InvoiceCard({ invoice, isFlat, onPress }: InvoiceCardProps) {
  const balance = invoiceBalancePaise(invoice.totalPaise, invoice.paidPaise);
  const failed = invoice.status === 'FAILED';

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.surfacePressed }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Invoice ${invoice.number}, ${invoice.tenantName}`}
    >
      <View style={styles.top}>
        <Typography variant="mono" color="textSecondary">
          {invoice.number}
        </Typography>
        <StatusBadge meta={INVOICE_STATUS_META[invoice.status]} size="sm" tinted={failed} />
      </View>

      <View style={styles.main}>
        <View style={styles.text}>
          <Typography variant="bodyMedium" numberOfLines={1}>
            {invoice.tenantName}
          </Typography>
          <Typography variant="small" color="textSecondary" numberOfLines={1}>
            {bedLocationShort(invoice.roomNumber, invoice.bedLabel, isFlat)} ·{' '}
            {formatShortMonthYear(invoice.billingMonth)} ·{' '}
            {invoice.receivedPaise !== null
              ? `For a payment of ${formatINR(invoice.receivedPaise)}`
              : 'Bill'}
          </Typography>
        </View>
        <View style={styles.amounts}>
          <Typography variant="number">{formatINR(invoice.totalPaise)}</Typography>
          <Typography variant="small" color={balance > 0 ? 'textSecondary' : 'textTertiary'}>
            {balance > 0 ? `${formatINR(balance)} due` : 'Settled'}
          </Typography>
        </View>
      </View>

      <Typography
        variant="small"
        colorValue={failed ? colors.error : colors.textTertiary}
        numberOfLines={2}
      >
        {failed
          ? invoice.lastError ?? 'Not sent'
          : invoice.sentAt
            ? `Sent ${formatFullDate(invoice.sentAt)} · paid ${formatINR(invoice.paidPaise)}`
            : ''}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
    gap: 6,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.canvas,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  amounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
