import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { Button, SegmentedControl, TextInput, Typography } from '@/components';
import { useAction } from '@/hooks';
import { assignTenantToBed } from '@/mocks';
import { useAuth } from '@/store';
import { colors, spacing } from '@/theme';
import { formatINR, rupeesToPaise, toISODateOnly, MAINTENANCE_RESERVE_PAISE } from '@/utils';
import type { PaymentMethod } from '@/types';

export interface AssignTenantFormProps {
  bedId: string;
  onDone: () => void;
}

function parseRupees(text: string): number {
  const value = Number.parseFloat(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? rupeesToPaise(value) : 0;
}

/**
 * AssignTenantForm
 *
 * Occupies an empty bed — the primary Floor Manager workflow (web
 * bed-form.tsx). Same fields, same defaults: details ready to fill in,
 * payment status starts PENDING, deposits are entered net of the ₹1000
 * maintenance reserve.
 */
export function AssignTenantForm({ bedId, onDone }: AssignTenantFormProps) {
  const { user } = useAuth();
  const { busy, run } = useAction();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rent, setRent] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [deposit, setDeposit] = useState('');
  const [checkInDate, setCheckInDate] = useState(toISODateOnly());
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID'>('PENDING');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashAmount, setCashAmount] = useState('');
  const [onlineAmount, setOnlineAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [fullName, phone, rent, checkInDate]);

  async function onSubmit() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInDate.trim())) {
      setError('Check-in date must be YYYY-MM-DD.');
      return;
    }
    const result = await run(() =>
      assignTenantToBed({
        bedId,
        fullName,
        phone,
        email: email.trim() || null,
        monthlyRent: parseRupees(rent),
        maintenanceCharge: parseRupees(maintenance),
        securityDeposit: deposit.trim() ? parseRupees(deposit) : null,
        checkInDate: new Date(`${checkInDate.trim()}T00:00:00`).toISOString(),
        paymentStatus,
        paymentMethod: paymentStatus === 'PAID' ? paymentMethod : undefined,
        cashAmount:
          paymentStatus === 'PAID' && paymentMethod === 'SPLIT'
            ? parseRupees(cashAmount)
            : undefined,
        onlineAmount:
          paymentStatus === 'PAID' && paymentMethod === 'SPLIT'
            ? parseRupees(onlineAmount)
            : undefined,
        recordedByName: user?.name,
      }),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <View style={styles.form}>
      <Typography variant="caption" color="textSecondary">
        This bed is vacant. Fill in the tenant details to check them in.
      </Typography>

      <TextInput
        label="Full name"
        placeholder="Tenant name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      <TextInput
        label="Phone"
        placeholder="10-digit mobile number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        maxLength={10}
      />
      <TextInput
        label="Email (optional)"
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.twoCol}>
        <View style={styles.col}>
          <TextInput
            label="Monthly rent (₹)"
            placeholder="8500"
            keyboardType="numeric"
            value={rent}
            onChangeText={setRent}
          />
        </View>
        <View style={styles.col}>
          <TextInput
            label="Maintenance (₹)"
            placeholder="0"
            keyboardType="numeric"
            value={maintenance}
            onChangeText={setMaintenance}
          />
        </View>
      </View>

      <TextInput
        label="Security deposit (₹)"
        placeholder="Optional"
        keyboardType="numeric"
        value={deposit}
        onChangeText={setDeposit}
        hint={`Enter net of the ${formatINR(MAINTENANCE_RESERVE_PAISE)} maintenance reserve deducted at move-in.`}
      />
      <TextInput
        label="Check-in date"
        placeholder="YYYY-MM-DD"
        value={checkInDate}
        onChangeText={setCheckInDate}
        autoCapitalize="none"
        hint="Native date picker arrives with the device-services build."
      />

      <View style={styles.statusBlock}>
        <Typography variant="captionMedium" color="textSecondary">
          First rent cycle
        </Typography>
        <SegmentedControl
          options={[
            { value: 'PENDING', label: 'Pending' },
            { value: 'PAID', label: 'Paid' },
          ]}
          value={paymentStatus}
          onChange={setPaymentStatus}
        />
      </View>

      {paymentStatus === 'PAID' && (
        <View style={styles.statusBlock}>
          <Typography variant="captionMedium" color="textSecondary">
            Payment method
          </Typography>
          <SegmentedControl
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'ONLINE', label: 'Online' },
              { value: 'SPLIT', label: 'Split' },
            ]}
            value={paymentMethod}
            onChange={setPaymentMethod}
          />
          {paymentMethod === 'SPLIT' && (
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <TextInput
                  label="Cash (₹)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={cashAmount}
                  onChangeText={setCashAmount}
                />
              </View>
              <View style={styles.col}>
                <TextInput
                  label="Online (₹)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={onlineAmount}
                  onChangeText={setOnlineAmount}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {error && (
        <Typography variant="caption" colorValue={colors.error}>
          {error}
        </Typography>
      )}

      <Button
        title="Check in tenant"
        icon="account-plus-outline"
        loading={busy}
        onPress={onSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  col: {
    flex: 1,
  },
  statusBlock: {
    gap: spacing.sm,
  },
});
