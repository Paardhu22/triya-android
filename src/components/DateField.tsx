import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { borderRadius, colors, spacing } from '@/theme';
import { formatDateTime, formatFullDate, toISODateOnly } from '@/utils';
import { haptics } from '@/utils/haptics';

export interface DateFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  /** 'date' picks a day; 'datetime' picks a day then a time. */
  mode?: 'date' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  hint?: string;
  error?: string;
  disabled?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

function toText(d: Date, mode: 'date' | 'datetime') {
  const date = toISODateOnly(d);
  return mode === 'date' ? date : `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseText(text: string, mode: 'date' | 'datetime'): Date | null {
  const m =
    mode === 'date'
      ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim())
      : /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  return Number.isNaN(d.getTime()) || d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3] || (m[4] && d.getHours() !== +m[4]) || (m[5] && d.getMinutes() !== +m[5]) ? null : d;
}

/**
 * DateField — replaces the web's `<input type="date|datetime-local">` with the
 * platform's own picker: Material date (then time) dialogs on Android, an
 * inline calendar sheet on iOS, and a typed field on web.
 */
export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  hint,
  error,
  disabled,
}: DateFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(value);
  const [webText, setWebText] = useState(() => toText(value, mode));

  if (Platform.OS === 'web') {
    return (
      <TextInput
        label={label}
        value={webText}
        placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'}
        onChangeText={(text) => {
          setWebText(text);
          const parsed = parseText(text, mode);
          if (parsed) onChange(parsed);
        }}
        hint={hint}
        error={error}
        editable={!disabled}
      />
    );
  }

  function open() {
    if (disabled) return;
    haptics.tap();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        minimumDate,
        maximumDate,
        design: 'material',
        onChange: (event, picked) => {
          if (event.type !== 'set' || !picked) return;
          const day = new Date(picked);
          day.setHours(value.getHours(), value.getMinutes(), 0, 0);
          if (mode === 'date') {
            onChange(day);
            return;
          }
          DateTimePickerAndroid.open({
            value: day,
            mode: 'time',
            design: 'material',
            onChange: (timeEvent, time) => {
              if (timeEvent.type !== 'set' || !time) {
                onChange(day);
                return;
              }
              const withTime = new Date(day);
              withTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
              onChange(maximumDate && withTime > maximumDate ? maximumDate : withTime);
            },
          });
        },
      });
      return;
    }
    setIosDraft(value);
    setIosOpen(true);
  }

  return (
    <View style={styles.wrapper}>
      <Typography variant="smallMedium" color="textSecondary" style={styles.label}>
        {label}
      </Typography>
      <Pressable
        onPress={open}
        disabled={disabled}
        style={({ pressed }) => [
          styles.field,
          pressed && styles.pressed,
          error ? styles.fieldError : null,
          disabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${mode === 'date' ? formatFullDate(value) : formatDateTime(value)}`}
      >
        <Typography variant="body" style={styles.value} numberOfLines={1}>
          {mode === 'date' ? formatFullDate(value) : formatDateTime(value)}
        </Typography>
        <Icon name="calendar-month-outline" size={19} color={colors.textSecondary} />
      </Pressable>
      {error ? (
        <Typography variant="small" colorValue={colors.error} style={styles.message}>
          {error}
        </Typography>
      ) : hint ? (
        <Typography variant="small" color="textTertiary" style={styles.message}>
          {hint}
        </Typography>
      ) : null}

      {Platform.OS === 'ios' && (
        <BottomSheet
          visible={iosOpen}
          onClose={() => setIosOpen(false)}
          title={label}
          footer={
            <Button
              title="Done"
              onPress={() => {
                onChange(iosDraft);
                setIosOpen(false);
              }}
            />
          }
        >
          <DateTimePicker
            value={iosDraft}
            mode={mode}
            display="inline"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_, picked) => picked && setIosDraft(picked)}
            accentColor={colors.primary}
          />
        </BottomSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.md - 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.canvas,
  },
  fieldError: {
    borderColor: colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
  value: {
    flex: 1,
  },
  message: {
    marginTop: spacing.xs,
  },
});
