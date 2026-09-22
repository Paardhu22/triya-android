import { View, StyleSheet } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import type { IconName } from '@/components/Icon';
import { ListRow } from '@/components/ListRow';
import { Surface } from '@/components/Surface';
import { spacing } from '@/theme';

export interface ActionSheetAction {
  label: string;
  description?: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions: ActionSheetAction[];
}

/**
 * ActionSheet — the web's per-row "Actions" dropdown as a bottom sheet of
 * large touch rows. Closes itself before running the chosen action so the
 * next sheet can open cleanly.
 */
export function ActionSheet({ visible, onClose, title, subtitle, actions }: ActionSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <View style={styles.body}>
        <Surface>
          {actions.map((action, index) => (
            <ListRow
              key={action.label}
              title={action.label}
              subtitle={action.description}
              icon={action.icon}
              destructive={action.destructive}
              disabled={action.disabled}
              divider={index > 0}
              hideChevron
              onPress={() => {
                onClose();
                // Let this sheet start closing before the next one opens.
                setTimeout(action.onPress, 180);
              }}
            />
          ))}
        </Surface>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: spacing.xs,
  },
});
