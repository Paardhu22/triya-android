import { AttachmentPicker } from '@/components/AttachmentPicker';
import type { PickedFile } from '@/services/types';
import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  Button,
  DateField,
  SegmentedControl,
  TextInput,
  Typography,
  toast,
} from '@/components';
import { useAction } from '@/hooks';
import { assignTenantToBed, getBedRoomDefaults } from '@/data';
import { useAuth } from '@/store';
import { colors, spacing } from '@/theme';
import type { PaymentMethod } from '@/types';
import {
  formatINR,
  paiseToRupees,
  rupeesToPaise,
  MAINTENANCE_RESERVE_PAISE,
} from '@/utils';

export interface AssignTenantFormProps {
  bedId: string;
  onDone: () => void;
}

function parseRupees(text: string): number {
  const value = Number.parseFloat(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? rupeesToPaise(value) : 0;
}

/** Room-level rent default as a form string; "" when the room has none. */
const roomAmount = (paise: number | null) => (paise ? String(paiseToRupees(paise)) : '');

/**
 * AssignTenantForm
 *
 * Occupies an empty bed — the primary Floor Manager workflow (web
 * bed-form.tsx). Rent starts from the room's default when one is set, so a
 * move-in never means re-typing the same amount for every bed. Choosing
 * "Paid" records the first month through the ledger and issues its invoice.
 */
export function AssignTenantForm({ bedId, onDone }: AssignTenantFormProps) {
  const { user } = useAuth();
  const { busy, run } = useAction();
  const defaults = useMemo(() => getBedRoomDefaults(bedId), [bedId]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rent, setRent] = useState(roomAmount(defaults.defaultRent));
  const [maintenance, setMaintenance] = useState(roomAmount(defaults.defaultMaintenance));
  const [deposit, setDeposit] = useState('');
  const [checkInDate, setCheckInDate] = useState(() => new Date());
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID'>('PENDING');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashAmount, setCashAmount] = useState('');
  const [onlineAmount, setOnlineAmount] = useState('');
  const [photo, setPhoto] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstMonthDue = parseRupees(rent) + parseRupees(maintenance);

  async function onSubmit() {
    setError(null);
    const result = await run(() =>
      assignTenantToBed({
        bedId,
        fullName,
        phone,
        email: email.trim() || null,
        monthlyRent: parseRupees(rent),
        maintenanceCharge: parseRupees(maintenance),
        securityDeposit: deposit.trim() ? parseRupees(deposit) : null,
        checkInDate: new Date(
          checkInDate.getFullYear(),
          checkInDate.getMonth(),
          checkInDate.getDate(),
        ).toISOString(),
        paymentStatus,
        paymentMethod: paymentStatus === 'PAID' ? paymentMethod : undefined,
        cashAmount:
          paymentStatus === 'PAID' && paymentMethod === 'SPLIT' ? parseRupees(cashAmount) : undefined,
        onlineAmount:
          paymentStatus === 'PAID' && paymentMethod === 'SPLIT' ? parseRupees(onlineAmount) : undefined,
        recordedByName: user?.name,
      }, photo),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Marking the bed Paid records a collection, which issues and sends its invoice.
    const invoice = result.data.invoice;
    if (!invoice) {
      toast.success(`${fullName.trim()} checked in`);
    } else if (invoice.delivered) {
      toast.success(`${fullName.trim()} checked in`, {
        description: `Rent recorded. Invoice ${invoice.number} sent to the tenant on WhatsApp.`,
      });
    } else {
      toast.warning(`${fullName.trim()} checked in`, {
        description: `Rent recorded, but invoice ${invoice.number ?? ''} was not sent: ${invoice.error ?? 'delivery failed'}.`,
      });
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
      <View style={styles.twoCol}>
        <View style={styles.col}>
          <TextInput
            label="Phone"
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
          />
        </View>
        <View style={styles.col}>
          <DateField label="Check-in" value={checkInDate} onChange={setCheckInDate} />
        </View>
      </View>
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
            label="Monthly rent"
            prefix="₹"
            placeholder="8500"
            keyboardType="decimal-pad"
            value={rent}
            onChangeText={setRent}
          />
        </View>
        <View style={styles.col}>
          <TextInput
            label="Maintenance"
            prefix="₹"
            placeholder="0"
            keyboardType="decimal-pad"
            value={maintenance}
            onChangeText={setMaintenance}
          />
        </View>
      </View>
      {defaults.defaultRent !== null && (
        <Typography variant="small" color="textTertiary" style={styles.defaultsNote}>
          Pre-filled from the room rent ({formatINR(defaults.defaultRent)}
          {defaults.defaultMaintenance ? ` + ${formatINR(defaults.defaultMaintenance)}` : ''}).
        </Typography>
      )}

      <TextInput
        label="Security deposit"
        prefix="₹"
        placeholder="Optional"
        keyboardType="decimal-pad"
        value={deposit}
        onChangeText={setDeposit}
        hint={`Enter net of the ${formatINR(MAINTENANCE_RESERVE_PAISE)} maintenance reserve held back at move-in.`}
      />

      <View style={styles.block}>
        <Typography variant="smallMedium" color="textSecondary">
          First month{firstMonthDue > 0 ? ` · ${formatINR(firstMonthDue)}` : ''}
        </Typography>
        <SegmentedControl
          options={[
            { value: 'PENDING', label: 'Not paid yet' },
            { value: 'PAID', label: 'Paid' },
          ]}
          value={paymentStatus}
          onChange={setPaymentStatus}
        />
      </View>

      {paymentStatus === 'PAID' && (
        <Animated.View entering={FadeIn.duration(180)} style={styles.block}>
          <Typography variant="smallMedium" color="textSecondary">
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
                  label="Cash"
                  prefix="₹"
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={cashAmount}
                  onChangeText={setCashAmount}
                />
              </View>
              <View style={styles.col}>
                <TextInput
                  label="Online"
                  prefix="₹"
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={onlineAmount}
                  onChangeText={setOnlineAmount}
                />
              </View>
            </View>
          )}
          <Typography variant="small" color="textTertiary">
            Records the month as collected and sends the invoice on WhatsApp.
          </Typography>
        </Animated.View>
      )}

      <AttachmentPicker value={photo} onChange={setPhoto} label="KYC photo (optional)" imagesOnly disabled={busy} />

      {error && (
        <Typography variant="caption" colorValue={colors.error}>
          {error}
        </Typography>
      )}

      <Button title="Check in tenant" icon="account-plus-outline" loading={busy} onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  col: {
    flex: 1,
  },
  defaultsNote: {
    marginTop: -spacing.sm,
  },
  block: {
    gap: spacing.sm,
  },
});
