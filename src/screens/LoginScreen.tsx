import { useState } from 'react';
import {
  View,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';

import {
  Screen,
  Card,
  Typography,
  TextInput,
  Button,
  Divider,
  SectionHeader,
} from '@/components';
import { colors, spacing, borderRadius } from '@/theme';

/**
 * Mock property data for the UI prototype.
 * Will be replaced with API data in a later phase.
 */
const MOCK_PROPERTIES = [
  { id: '1', name: 'Sunrise Apartments' },
  { id: '2', name: 'Lakeview Residences' },
  { id: '3', name: 'Oakwood Towers' },
  { id: '4', name: 'Maple Heights' },
  { id: '5', name: 'Cedar Park Villas' },
];

/**
 * LoginScreen (UI Prototype)
 *
 * Replicates the Triya Manager web application login workflow:
 * 1. Select a property from the dropdown
 * 2. Enter password
 * 3. Tap Sign In
 *
 * No authentication logic. No API calls. Pure UI.
 */
export function LoginScreen() {
  const [selectedProperty, setSelectedProperty] = useState<typeof MOCK_PROPERTIES[0] | null>(null);
  const [password, setPassword] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const canSubmit = selectedProperty !== null && password.length > 0;

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {/* Branding */}
        <View style={styles.branding}>
          <Typography variant="h1" color="text">
            Triya Manager
          </Typography>
          <Typography variant="body" color="textSecondary" style={styles.tagline}>
            Property management, simplified.
          </Typography>
        </View>

        {/* Login Card */}
        <Card>
          <SectionHeader
            title="Sign In"
            subtitle="Select your property and enter your password."
          />

          <Divider verticalSpacing="sm" />

          {/* Property Selector */}
          <View style={styles.fieldGroup}>
            <Typography
              variant="captionMedium"
              color="textSecondary"
              style={styles.fieldLabel}
            >
              Property
            </Typography>

            <Pressable
              onPress={() => setIsPickerOpen(true)}
              style={({ pressed }) => [
                styles.selector,
                pressed && styles.selectorPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Select property"
            >
              <Typography
                variant="body"
                color={selectedProperty ? 'text' : 'textTertiary'}
                style={styles.selectorText}
              >
                {selectedProperty?.name ?? 'Select a property'}
              </Typography>
              <Typography variant="caption" color="textTertiary">
                {'\u25BE'}
              </Typography>
            </Pressable>
          </View>

          {/* Password Input */}
          <View style={styles.fieldGroup}>
            <TextInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Sign In Button */}
          <Button
            title="Sign In"
            variant="primary"
            size="lg"
            disabled={!canSubmit}
            onPress={() => {
              // No-op: UI prototype only
            }}
            style={styles.signInButton}
          />
        </Card>

        {/* Footer */}
        <Typography
          variant="small"
          color="textTertiary"
          style={styles.footer}
        >
          Triya Manager v1.0.0
        </Typography>
      </View>

      {/* Property Picker Modal */}
      <Modal
        visible={isPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsPickerOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Typography variant="h3">Select Property</Typography>
            </View>

            <Divider verticalSpacing="xs" />

            <FlatList
              data={MOCK_PROPERTIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedProperty?.id === item.id;
                return (
                  <Pressable
                    onPress={() => {
                      setSelectedProperty(item);
                      setIsPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Typography
                      variant="body"
                      color={isSelected ? 'primary' : 'text'}
                    >
                      {item.name}
                    </Typography>
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <Divider verticalSpacing="xs" />}
            />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  branding: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  tagline: {
    marginTop: spacing.xs,
  },
  fieldGroup: {
    marginTop: spacing.md,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  selectorPressed: {
    borderColor: colors.primary,
  },
  selectorText: {
    flex: 1,
  },
  signInButton: {
    marginTop: spacing.lg,
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    maxHeight: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  optionRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionPressed: {
    backgroundColor: colors.surfacePressed,
  },
});
