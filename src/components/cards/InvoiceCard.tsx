import { View, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Typography } from '@/components/Typography';
import { INVOICE_STATUS_META } from '@/constants';
import type { InvoiceHistoryRow } from '@/mocks';
import { colors, spacing, borderRadius } from '@/theme';
import {
  bedLocationShort,
  formatFullDate,
  formatINR,
  formatShortMonthYear,
} from '@/utils';

export interface InvoiceCardProps {
  invoice: InvoiceHistoryRow;
  isFlat: boolean;
  /** Re-send the PDF on WhatsApp. */
  onResend: () => void;
  /** Spinner state for the resend action. */
  resending?: boolean;
}

/**
 * InvoiceCard component.
 *
 * An invoice history row: number, tenant + location, billed month, total,
 * sent/failed status and the resend action. Replaces the web history table.
 *
 * @example
 * <InvoiceCard invoice={row} isFlat={false} onResend={() => resend(row.id)} />
 */
export function InvoiceCard({ invoice, isFlat, onResend, resending = false }: InvoiceCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Typography variant="captionMedium" style={styles.number}>
          {invoice.number}
        </Typography>
        <StatusBadge meta={INVOICE_STATUS_META[invoice.status]} size="sm" />
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.text}>
          <Typography variant="bodyMedium" numberOfLines={1}>
            {invoice.tenantName}
          </Typography>
          <Typography variant="small" color="textSecondary" numberOfLines={1}>
            {bedLocationShort(invoice.roomNumber, invoice.bedLabel, isFlat)} ·{' '}
            {formatShortMonthYear(invoice.billingMonth)}
            {invoice.sentAt ? ` · sent ${formatFullDate(invoice.sentAt)}` : ''}
          </Typography>
        </View>
        <Typography variant="h3">{formatINR(invoice.totalPaise)}</Typography>
      </View>

      <Button
        title={invoice.status === 'FAILED' ? 'Send again' : 'Resend on WhatsApp'}
        icon="whatsapp"
        variant="outline"
        size="sm"
        loading={resending}
        onPress={onResend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  number: {
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 1,
  },
});
