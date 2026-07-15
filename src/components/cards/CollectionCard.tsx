import { View, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Typography } from '@/components/Typography';
import { PAYMENT_STATUS_META } from '@/constants';
import type { CollectionRow } from '@/mocks';
import { colors, spacing, borderRadius } from '@/theme';
import {
  bedLocationLabel,
  currentCycleDuePaise,
  formatFullDate,
  formatINR,
} from '@/utils';

export interface CollectionCardProps {
  row: CollectionRow;
  isFlat: boolean;
  /** WhatsApp rent reminder. Only rendered while unpaid. */
  onRemind: () => void;
  /** Record the payment. Only rendered while unpaid. */
  onMarkPaid: () => void;
  /** Generate + send this month's invoice. Always available. */
  onSendInvoice: () => void;
  /** Disables the action row during a mutation. */
  busy?: boolean;
}

/**
 * CollectionCard component.
 *
 * One active tenancy's dues: tenant, location, rent, the amount still due
 * this cycle (zero once paid — the collections page rule), last invoice date
 * and the rent-chasing actions. Replaces the web dues table row.
 *
 * @example
 * <CollectionCard row={row} isFlat={false} onRemind={remind} onMarkPaid={mark} onSendInvoice={send} />
 */
export function CollectionCard({
  row,
  isFlat,
  onRemind,
  onMarkPaid,
  onSendInvoice,
  busy = false,
}: CollectionCardProps) {
  const isPaid = row.paymentStatus === 'PAID';
  const totalDue = currentCycleDuePaise(row);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Typography variant="bodyMedium" numberOfLines={1}>
            {row.tenant.fullName}
          </Typography>
          <Typography variant="small" color="textSecondary" numberOfLines={1}>
            {bedLocationLabel(row.roomNumber, row.bedLabel, isFlat)} · {row.tenant.phone}
          </Typography>
        </View>
        <StatusBadge meta={PAYMENT_STATUS_META[row.paymentStatus]} size="sm" />
      </View>

      <View style={styles.figuresRow}>
        <View style={styles.figure}>
          <Typography variant="small" color="textTertiary">
            Rent
          </Typography>
          <Typography variant="captionMedium">{formatINR(row.monthlyRent)}</Typography>
        </View>
        <View style={styles.figure}>
          <Typography variant="small" color="textTertiary">
            Total due
          </Typography>
          <Typography
            variant="captionMedium"
            colorValue={totalDue > 0 ? colors.error : colors.success}
          >
            {formatINR(totalDue)}
          </Typography>
        </View>
        <View style={[styles.figure, styles.figureWide]}>
          <Typography variant="small" color="textTertiary">
            Last invoice
          </Typography>
          <Typography variant="captionMedium" numberOfLines={1}>
            {row.lastInvoiceAt ? formatFullDate(row.lastInvoiceAt) : 'Never'}
          </Typography>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {!isPaid && (
          <Button
            title="Remind"
            icon="whatsapp"
            variant="outline"
            size="sm"
            disabled={busy}
            onPress={onRemind}
            style={styles.action}
          />
        )}
        {!isPaid && (
          <Button
            title="Mark Paid"
            icon="check-circle-outline"
            variant="secondary"
            size="sm"
            disabled={busy}
            onPress={onMarkPaid}
            style={styles.action}
          />
        )}
        <Button
          title="Invoice"
          icon="receipt"
          variant={isPaid ? 'outline' : 'primary'}
          size="sm"
          disabled={busy}
          onPress={onSendInvoice}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  figuresRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  figure: {
    gap: 1,
  },
  figureWide: {
    flex: 1,
    alignItems: 'flex-end',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
