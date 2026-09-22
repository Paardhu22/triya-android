import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet, Button, CheckboxRow, TextInput, Typography, toast } from '@/components';
import { useAction } from '@/hooks';
import { setRoomRent } from '@/mocks';
import { useAuth } from '@/store';
import { colors, spacing } from '@/theme';
import { paiseToRupees, rupeesToPaise } from '@/utils';

export interface RoomRentTarget {
  id: string;
  number: string;
  defaultRent: number | null;
  defaultMaintenance: number | null;
  /** Active tenancies in the room — how many "apply to occupants" would touch. */
  occupantCount: number;
}

const toInput = (paise: number | null) => (paise === null ? '' : String(paiseToRupees(paise)));

/** Blank clears the room default; anything else must be a valid non-negative number. */
function toAmount(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? rupeesToPaise(n) : undefined;
}

/**
 * RoomRentSheet — set rent for a whole room rather than one tenant at a time
 * (web RoomRentDialog). The amounts become the room's defaults, pre-filling a
 * new move-in, and can optionally be pushed onto everyone in the room.
 */
export function RoomRentSheet({
  visible,
  room,
  isFlat,
  onClose,
}: {
  visible: boolean;
  room: RoomRentTarget;
  isFlat: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { busy, run } = useAction();
  const [rent, setRent] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [applyToOccupants, setApplyToOccupants] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noun = isFlat ? 'Flat' : 'Room';

  useEffect(() => {
    if (!visible) return;
    setRent(toInput(room.defaultRent));
    setMaintenance(toInput(room.defaultMaintenance));
    setApplyToOccupants(false);
    setError(null);
  }, [visible, room.defaultRent, room.defaultMaintenance]);

  async function save() {
    const rentValue = toAmount(rent);
    const maintenanceValue = toAmount(maintenance);
    if (rentValue === undefined || maintenanceValue === undefined) {
      setError('Enter a valid amount, or leave it blank to clear the default');
      return;
    }
    if (applyToOccupants && rentValue === null) {
      setError('Enter a rent amount before applying it to the current occupants');
      return;
    }
    const res = await run(() =>
      setRoomRent(
        { roomId: room.id, rent: rentValue, maintenance: maintenanceValue, applyToOccupants },
        user?.role,
      ),
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const n = res.data.updatedTenancies;
    toast.success(
      n > 0
        ? `${noun} ${room.number} rent saved and applied to ${n} tenant${n === 1 ? '' : 's'}`
        : `${noun} ${room.number} rent saved`,
    );
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`${noun} ${room.number} rent`}
      subtitle={`New move-ins start from these amounts.`}
      footer={<Button title="Save rent" icon="check" loading={busy} onPress={save} />}
    >
      <View style={styles.body}>
        <Typography variant="caption" color="textSecondary">
          Sets the rent for the whole {noun.toLowerCase()}. Existing tenants keep their own rent
          unless you apply it below.
        </Typography>
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <TextInput
              label="Rent / month"
              prefix="₹"
              placeholder="e.g. 9000"
              keyboardType="decimal-pad"
              value={rent}
              onChangeText={(t) => {
                setRent(t);
                setError(null);
              }}
            />
          </View>
          <View style={styles.col}>
            <TextInput
              label="Maintenance / month"
              prefix="₹"
              placeholder="0"
              keyboardType="decimal-pad"
              value={maintenance}
              onChangeText={(t) => {
                setMaintenance(t);
                setError(null);
              }}
            />
          </View>
        </View>
        <CheckboxRow
          checked={applyToOccupants}
          onChange={(v) => {
            setApplyToOccupants(v);
            setError(null);
          }}
          disabled={room.occupantCount === 0}
          label="Apply to current occupants"
          description={
            room.occupantCount === 0
              ? `No one is currently in this ${noun.toLowerCase()}.`
              : `Overwrites the rent of ${room.occupantCount} active tenant${room.occupantCount === 1 ? '' : 's'} from their next view of dues.`
          }
        />
        <Typography variant="small" color="textTertiary">
          Leave a field blank to clear the {noun.toLowerCase()} default.
        </Typography>
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
  body: {
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
});
