import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import {
  ConfirmDialog,
  SegmentedControl,
  SuccessDialog,
  TextInput,
  Typography,
} from '@/components';
import { useAction } from '@/hooks';
import { markRentPaid } from '@/mocks';
import { useAuth } from '@/store';
import { colors, spacing } from '@/theme';
import { formatINR, rupeesToPaise } from '@/utils';
import type { PaymentMethod } from '@/types';
import { SendInvoiceSheet } from './SendInvoiceSheet';

export interface MarkPaidFlowProps {
  visible: boolean;
  tenancyId: string | null;
  tenantName: string;
  /** Paise. Rent + maintenance for the cycle. */
  amountPaise: number;
  isFlat: boolean;
  onClose: () => void;
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'SPLIT', label: 'Split' },
];

function parseRupees(text: string): number {
  const value = Number.parseFloat(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? rupeesToPaise(value) : 0;
}

/**
 * MarkPaidFlow
 *
 * The web's mark-as-paid workflow, redesigned for touch: confirm the amount
 * (choosing how it was received — cash, online, or a split), then the
 * follow-up prompt offers to send the invoice immediately, exactly like the
 * web's post-payment dialog chain.
 */
export function MarkPaidFlow({
  visible,
  tenancyId,
  tenantName,
  amountPaise,
  isFlat,
  onClose,
}: MarkPaidFlowProps) {
  const { user } = useAuth();
  const { busy, run } = useAction();

  const [stage, setStage] = useState<'confirm' | 'success' | 'invoice'>('confirm');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cashText, setCashText] = useState('');
  const [onlineText, setOnlineText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStage('confirm');
      setMethod('CASH');
      setCashText('');
      setOnlineText('');
      setError(null);
    }
  }, [visible, tenancyId]);

  const cashPaise = parseRupees(cashText);
  const onlinePaise = parseRupees(onlineText);
  const splitMismatch = method === 'SPLIT' && cashPaise + onlinePaise !== amountPaise;

  async function onConfirm() {
    if (!tenancyId) return;
    if (splitMismatch) {
      setError(`Split amounts must add up to ${formatINR(amountPaise)}.`);
      return;
    }
    setError(null);
    const result = await run(() =>
      markRentPaid({
        tenancyId,
        method,
        cashAmount: method === 'SPLIT' ? cashPaise : undefined,
        onlineAmount: method === 'SPLIT' ? onlinePaise : undefined,
        recordedByName: user?.name,
      }),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStage('success');
  }

  return (
    <>
      <ConfirmDialog
        visible={visible && stage === 'confirm'}
        title="Confirm Payment"
        message={`Has the rent payment of ${formatINR(amountPaise)} been received from ${tenantName}?`}
        confirmLabel="Confirm Payment"
        loading={busy}
        onConfirm={onConfirm}
        onCancel={onClose}
      >
        <View style={styles.methodBlock}>
          <Typography variant="captionMedium" color="textSecondary">
            Received via
          </Typography>
          <SegmentedControl options={METHOD_OPTIONS} value={method} onChange={setMethod} />
          {method === 'SPLIT' && (
            <View style={styles.splitRow}>
              <View style={styles.splitCol}>
                <TextInput
                  label="Cash (₹)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={cashText}
                  onChangeText={setCashText}
                />
              </View>
              <View style={styles.splitCol}>
                <TextInput
                  label="Online (₹)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={onlineText}
                  onChangeText={setOnlineText}
                />
              </View>
            </View>
          )}
          {error && (
            <Typography variant="caption" colorValue={colors.error}>
              {error}
            </Typography>
          )}
        </View>
      </ConfirmDialog>

      <SuccessDialog
        visible={visible && stage === 'success'}
        title="Payment recorded"
        message="Payment recorded successfully. Would you like to send the invoice now?"
        primaryAction={{ label: 'Send Invoice', onPress: () => setStage('invoice') }}
        secondaryAction={{ label: 'Later', onPress: onClose }}
      />

      <SendInvoiceSheet
        visible={visible && stage === 'invoice'}
        tenancyId={tenancyId}
        isFlat={isFlat}
        onClose={onClose}
      />
    </>
  );
}

const styles = StyleSheet.create({
  methodBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  splitCol: {
    flex: 1,
  },
});
