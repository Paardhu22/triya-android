import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { BottomSheet, Button, TextInput, Typography } from '@/components';
import { useAction } from '@/hooks';
import { updatePropertySettings } from '@/mocks';
import { colors, spacing } from '@/theme';
import type { Property } from '@/types';

export interface EditPropertySheetProps {
  visible: boolean;
  property: Property;
  onClose: () => void;
}

/**
 * EditPropertySheet
 *
 * The web Settings "Property" card's edit form: name, address, city,
 * phone and the house rules used by Send-house-rules. ADMIN only.
 */
export function EditPropertySheet({ visible, property, onClose }: EditPropertySheetProps) {
  const { busy, run } = useAction();

  const [name, setName] = useState(property.name);
  const [address, setAddress] = useState(property.address ?? '');
  const [city, setCity] = useState(property.city ?? '');
  const [phone, setPhone] = useState(property.phone ?? '');
  const [rulesText, setRulesText] = useState(property.rulesText ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(property.name);
      setAddress(property.address ?? '');
      setCity(property.city ?? '');
      setPhone(property.phone ?? '');
      setRulesText(property.rulesText ?? '');
      setError(null);
    }
  }, [visible, property]);

  async function onSubmit() {
    const result = await run(() =>
      updatePropertySettings(property.id, {
        name,
        address: address.trim() || null,
        city: city.trim() || null,
        phone: phone.trim() || null,
        rulesText: rulesText.trim() || null,
      }),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit property">
      <View style={styles.form}>
        <TextInput label="Property name" value={name} onChangeText={setName} />
        <TextInput label="Address" value={address} onChangeText={setAddress} />
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <TextInput label="City" value={city} onChangeText={setCity} />
          </View>
          <View style={styles.col}>
            <TextInput
              label="Phone"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </View>
        <TextInput
          label="House rules"
          placeholder="Sent to tenants with Send house rules"
          value={rulesText}
          onChangeText={setRulesText}
          multiline
          numberOfLines={4}
          style={styles.multiline}
          hint="Required before staff can send house rules on WhatsApp."
        />
        {error && (
          <Typography variant="caption" colorValue={colors.error}>
            {error}
          </Typography>
        )}
        <Button
          title="Save changes"
          icon="content-save-outline"
          loading={busy}
          disabled={!name.trim()}
          onPress={onSubmit}
        />
      </View>
    </BottomSheet>
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
  multiline: {
    height: 108,
    textAlignVertical: 'top',
    paddingTop: spacing.sm + 4,
  },
});
