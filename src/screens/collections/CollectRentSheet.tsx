import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import {
  BottomSheet,
  Button,
  CheckboxRow,
  ConfirmDialog,
  DateField,
  Icon,
  MonthPicker,
  SegmentedControl,
  Skeleton,
  StatusBadge,
  TextInput,
  Typography,
  toast,
} from '@/components';
import { COLLECTION_STATE_META, PAYMENT_STATUS_META } from '@/constants';
import { useAction, useRentCollection } from '@/hooks';
import { collectRent, deleteRentCollection, type CollectRentResult } from '@/mocks';
import { useAuth } from '@/store';
import { borderRadius, colors, spacing } from '@/theme';
import type { PaymentMethod } from '@/types';
import {
  PAYMENT_METHOD_META,
  addMonths,
  formatDateTime,
  formatINR,
  formatMonthYear,
  formatShortMonthYear,
  monthFromKey,
  monthKey,
  paiseToRupees,
  rupeesToPaise,
  startOfMonth,
} from '@/utils';

export interface CollectRentSheetProps {
  visible: boolean;
  tenancyId: string | null;
  /** Billing month (YYYY-MM) to open on; the current month when omitted. */
  defaultMonth?: string;
  onClose: () => void;
  /** Fired after a successful collection. */
  onCollected?: (result: CollectRentResult) => void;
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'SPLIT', label: 'Split' },
];

/** Rupee text → paise; blank or invalid → 0. */
function toPaise(text: string): number {
  const value = Number.parseFloat(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? rupeesToPaise(value) : 0;
}

const rupeeText = (paise: number) => (paise > 0 ? String(paiseToRupees(paise)) : '');

/** Tell the staff what happened to the money AND to the invoice sent for it (web `announce`). */
function announce(result: CollectRentResult) {
  const headline = result.fullyPaid
    ? 'Collection recorded. This month is fully paid.'
    : `Collection recorded. ${formatINR(result.balancePaise)} still due.`;
  const invoice = result.invoice;
  if (!invoice) {
    toast.success(headline);
  } else if (invoice.delivered) {
    toast.success(headline, {
      description: `Invoice ${invoice.number} sent to the tenant on WhatsApp.`,
    });
  } else {
    toast.warning(headline, {
      description: invoice.number
        ? `Invoice ${invoice.number} was created but not sent: ${invoice.error ?? 'delivery failed'}. Resend it from Invoice History.`
        : `The invoice could not be created: ${invoice.error ?? 'unknown error'}.`,
      duration: 7000,
    });
  }
}

/**
 * CollectRentSheet
 *
 * Record a rent collection against one active tenancy — the web's Collect
 * Rent dialog. How much came in (a part payment is fine; a month can take
 * several), how it was split between cash and online, and when. Shows the
 * month's position and history, any unpaid earlier months, and by default
 * issues + sends the invoice for the collection.
 */
export function CollectRentSheet({
  visible,
  tenancyId,
  defaultMonth,
  onClose,
  onCollected,
}: CollectRentSheetProps) {
  const { user } = useAuth();
  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { busy, run } = useAction();

  const [month, setMonth] = useState(defaultMonth ?? monthKey(new Date()));
  const { data: view, isLoading, isFetching } = useRentCollection(
    visible ? tenancyId : null,
    month,
  );

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cash, setCash] = useState('');
  const [online, setOnline] = useState('');
  const [collectedAt, setCollectedAt] = useState(() => new Date());
  const [notes, setNotes] = useState('');
  const [sendInvoice, setSendInvoice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Fresh form whenever the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setMonth(defaultMonth ?? monthKey(new Date()));
    setMethod('CASH');
    setCash('');
    setOnline('');
    setCollectedAt(new Date());
    setNotes('');
    setSendInvoice(true);
    setError(null);
  }, [visible, tenancyId, defaultMonth]);

  // Pre-fill with what is still owed — the overwhelmingly common case — but
  // leave it editable so a part payment is recorded as it actually happened.
  const loadedKey = view ? `${view.tenancyId}:${view.month}` : null;
  useEffect(() => {
    if (!view) return;
    setAmount(rupeeText(view.balancePaise));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedKey]);

  // Months from move-in to now, newest first.
  const monthOptions = useMemo(() => {
    if (!view) return [];
    const first = monthFromKey(view.firstMonth).getTime();
    const options: { value: string; label: string }[] = [];
    for (let m = startOfMonth(new Date()); m.getTime() >= first; m = addMonths(m, -1)) {
      options.push({ value: monthKey(m), label: formatMonthYear(m) });
      if (options.length >= 36) break;
    }
    return options;
  }, [view]);

  const enteredPaise = toPaise(amount);
  // Live echo of what this entry will do to the month.
  const preview = view
    ? (() => {
        const collected = view.collectedPaise + enteredPaise;
        return {
          collected,
          balance: Math.max(0, view.duePaise - collected),
          advance: Math.max(0, collected - view.duePaise),
        };
      })()
    : null;

  async function onSubmit() {
    if (!view || !tenancyId) return;
    if (enteredPaise <= 0) {
      setError('Enter the amount collected');
      return;
    }
    const cashPaise = toPaise(cash);
    const onlinePaise = toPaise(online);
    if (method === 'SPLIT' && cashPaise + onlinePaise !== enteredPaise) {
      setError(`Cash + online must add up to ${formatINR(enteredPaise)}`);
      return;
    }
    setError(null);
    const res = await run(() =>
      collectRent({
        tenancyId,
        forMonth: month,
        amount: enteredPaise,
        method,
        cashAmount: method === 'SPLIT' ? cashPaise : undefined,
        onlineAmount: method === 'SPLIT' ? onlinePaise : undefined,
        collectedAt: collectedAt.toISOString(),
        notes: notes.trim() || null,
        sendInvoice,
        recordedByName: user?.name ?? null,
      }),
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    announce(res.data);
    onCollected?.(res.data);
    onClose();
  }

  async function onConfirmDelete() {
    if (!pendingDelete) return;
    const res = await run(() => deleteRentCollection(pendingDelete, user?.role));
    setPendingDelete(null);
    if (res.ok) toast.success('Collection removed');
    else toast.error(res.error);
  }

  const loading = isLoading || !view;

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title="Collect rent"
        subtitle={view ? `${view.tenantName} · ${view.room}` : 'Loading tenancy details…'}
        footer={
          <Button
            title={
              enteredPaise > 0 ? `Record ${formatINR(enteredPaise)}` : 'Record collection'
            }
            icon="check"
            loading={busy}
            disabled={loading || isFetching}
            onPress={onSubmit}
          />
        }
      >
        {loading ? (
          <View style={styles.loading}>
            <Skeleton height={36} width={170} radius={18} />
            <Skeleton height={132} radius={borderRadius.lg} />
            <Skeleton height={48} radius={borderRadius.md} />
            <Skeleton height={48} radius={borderRadius.md} />
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={styles.body}>
            {/* Month + position */}
            <View style={styles.monthRow}>
              <MonthPicker
                value={month}
                options={monthOptions}
                onChange={setMonth}
                loading={isFetching}
              />
              <View style={styles.badges}>
                <StatusBadge meta={COLLECTION_STATE_META[view.state]} size="sm" />
                {view.status === 'OVERDUE' && (
                  <StatusBadge meta={PAYMENT_STATUS_META.OVERDUE} size="sm" tinted />
                )}
              </View>
            </View>

            <View style={styles.position}>
              <View style={styles.metrics}>
                <Metric label="Rent" value={formatINR(view.rentPaise)} />
                <Metric label="Maintenance" value={formatINR(view.maintenancePaise)} />
                <Metric label="Collected" value={formatINR(view.collectedPaise)} />
                <Metric
                  label={view.advancePaise > 0 ? 'Advance' : 'Balance'}
                  value={formatINR(view.advancePaise > 0 ? view.advancePaise : view.balancePaise)}
                  strong
                />
              </View>
              <View style={styles.positionFoot}>
                <FootFigure label="Month due" value={formatINR(view.duePaise)} />
                <FootFigure label="Cash" value={formatINR(view.cashPaise)} />
                <FootFigure label="Online" value={formatINR(view.onlinePaise)} />
              </View>
            </View>

            {view.earlierDuePaise > 0 && (
              <View style={styles.earlier}>
                <Icon name="history" size={16} color={colors.warning} />
                <View style={styles.earlierText}>
                  <Typography variant="small" color="textSecondary">
                    Also unpaid from earlier months:{' '}
                    <Typography variant="smallMedium">{formatINR(view.earlierDuePaise)}</Typography>
                  </Typography>
                  <View style={styles.earlierChips}>
                    {view.earlierDueMonths.slice(0, 6).map((key) => (
                      <Pressable
                        key={key}
                        onPress={() => setMonth(key)}
                        style={({ pressed }) => [styles.monthChip, pressed && styles.monthChipPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Collect for ${formatMonthYear(monthFromKey(key))}`}
                      >
                        <Typography variant="smallMedium">
                          {formatShortMonthYear(monthFromKey(key))}
                        </Typography>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* New collection */}
            <TextInput
              label="Amount collected"
              prefix="₹"
              placeholder="0"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={(t) => {
                setAmount(t);
                setError(null);
              }}
            />
            {view.balancePaise > 0 && enteredPaise !== view.balancePaise && (
              <Pressable
                onPress={() => setAmount(rupeeText(view.balancePaise))}
                style={styles.quickFill}
                hitSlop={6}
              >
                <Icon name="lightning-bolt-outline" size={14} color={colors.text} />
                <Typography variant="smallMedium">
                  Fill balance {formatINR(view.balancePaise)}
                </Typography>
              </Pressable>
            )}

            <View style={styles.field}>
              <Typography variant="smallMedium" color="textSecondary">
                Payment method
              </Typography>
              <SegmentedControl options={METHOD_OPTIONS} value={method} onChange={setMethod} />
            </View>

            {method === 'SPLIT' && (
              <Animated.View entering={FadeIn.duration(180)} style={styles.twoCol}>
                <View style={styles.col}>
                  <TextInput
                    label="Cash"
                    prefix="₹"
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={cash}
                    onChangeText={(t) => {
                      setCash(t);
                      const rest = enteredPaise - toPaise(t);
                      if (rest >= 0) setOnline(rupeeText(rest));
                    }}
                  />
                </View>
                <View style={styles.col}>
                  <TextInput
                    label="Online"
                    prefix="₹"
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={online}
                    onChangeText={setOnline}
                  />
                </View>
              </Animated.View>
            )}

            <DateField
              label="Collected on"
              mode="datetime"
              value={collectedAt}
              onChange={setCollectedAt}
              maximumDate={new Date()}
            />

            <TextInput
              label="Note (optional)"
              placeholder="e.g. UPI ref / paid at the desk"
              value={notes}
              onChangeText={setNotes}
            />

            {preview && enteredPaise > 0 && (
              <Animated.View layout={LinearTransition.duration(180)} style={styles.previewLine}>
                <Typography variant="small" color="textSecondary">
                  After this entry the month shows{' '}
                  <Typography variant="smallMedium">{formatINR(preview.collected)}</Typography>{' '}
                  collected
                  {preview.advance > 0 ? (
                    <>
                      {' '}— <Typography variant="smallMedium">{formatINR(preview.advance)}</Typography>{' '}
                      in advance.
                    </>
                  ) : preview.balance > 0 ? (
                    <>
                      {' '}and{' '}
                      <Typography variant="smallMedium">{formatINR(preview.balance)}</Typography> still
                      due (partially paid).
                    </>
                  ) : (
                    <> — fully paid.</>
                  )}
                </Typography>
              </Animated.View>
            )}

            <CheckboxRow
              checked={sendInvoice}
              onChange={setSendInvoice}
              label="Send the invoice on WhatsApp"
              description="Issues the invoice for this payment and sends it to the tenant."
            />

            {error && (
              <Typography variant="caption" colorValue={colors.error}>
                {error}
              </Typography>
            )}

            {/* This month's collections */}
            <View style={styles.history}>
              <Typography variant="overline" color="textSecondary">
                Collections for {formatMonthYear(monthFromKey(month))}
              </Typography>
              {view.collections.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Typography variant="caption" color="textSecondary">
                    Nothing collected for this month yet.
                  </Typography>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {view.collections.map((c, i) => (
                    <View key={c.id} style={[styles.historyRow, i > 0 && styles.hairlineTop]}>
                      <View style={styles.historyIcon}>
                        <Icon name="cash" size={16} color={colors.text} />
                      </View>
                      <View style={styles.historyText}>
                        <Typography variant="number">
                          {formatINR(c.amountPaise)}{' '}
                          <Typography variant="small" color="textSecondary">
                            {PAYMENT_METHOD_META[c.method].label}
                            {c.method === 'SPLIT'
                              ? ` · ${formatINR(c.cashPaise)} cash + ${formatINR(c.onlinePaise)} online`
                              : ''}
                          </Typography>
                        </Typography>
                        <Typography variant="small" color="textSecondary">
                          {formatDateTime(c.collectedAt)}
                          {c.recordedBy ? ` · by ${c.recordedBy}` : ''}
                        </Typography>
                        {c.notes ? (
                          <Typography variant="small" color="textTertiary">
                            {c.notes}
                          </Typography>
                        ) : null}
                      </View>
                      {canDelete && (
                        <Pressable
                          onPress={() => setPendingDelete(c.id)}
                          hitSlop={10}
                          style={({ pressed }) => [styles.deleteBtn, pressed && styles.deletePressed]}
                          accessibilityRole="button"
                          accessibilityLabel="Remove collection"
                        >
                          <Icon name="trash-can-outline" size={18} color={colors.textSecondary} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </BottomSheet>

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Remove this collection?"
        message="Use this to correct a wrongly entered receipt. The month's balance and status are recalculated; an invoice already sent for it is kept."
        confirmLabel="Remove"
        destructive
        loading={busy}
        onConfirm={onConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.metric}>
      <Typography variant="small" color="textSecondary">
        {label}
      </Typography>
      <Typography variant={strong ? 'h2' : 'number'} style={styles.tabular} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Typography>
    </View>
  );
}

function FootFigure({ label, value }: { label: string; value: string }) {
  return (
    <Typography variant="small" color="textSecondary">
      {label} <Typography variant="smallMedium">{value}</Typography>
    </Typography>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  body: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  position: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    rowGap: spacing.md,
  },
  metric: {
    width: '50%',
    gap: 2,
    paddingRight: spacing.sm,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  positionFoot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  earlier: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warningLight,
  },
  earlierText: {
    flex: 1,
    gap: spacing.sm,
  },
  earlierChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  monthChip: {
    height: 28,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: 14,
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  monthChipPressed: {
    backgroundColor: colors.surfacePressed,
  },
  quickFill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: -spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  field: {
    gap: 6,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  col: {
    flex: 1,
  },
  previewLine: {
    paddingHorizontal: 2,
  },
  history: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  historyEmpty: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  historyList: {
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    padding: spacing.sm + 4,
  },
  hairlineTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  historyIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  historyText: {
    flex: 1,
    gap: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePressed: {
    backgroundColor: colors.errorLight,
  },
});
