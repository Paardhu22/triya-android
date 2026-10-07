import { useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Typography } from '@/components/Typography';
import { GroupedItem } from '@/components/GroupedItem';
import { useNotifications, useAction } from '@/hooks';
import { markAllNotificationsRead, markNotificationRead } from '@/mocks/actions';
import { useActiveProperty } from '@/store';
import { colors, spacing, borderRadius, fontFamilies, GUTTER } from '@/theme';
import { formatRelative } from '@/utils';
import type { AppNotification } from '@/types';

const KIND_ICONS: Record<string, IconName> = {
  RENT_DUE: 'currency-inr',
  PAYMENT_RECEIVED: 'check-circle-outline',
  COMPLAINT_NEW: 'alert-circle-outline',
  COMPLAINT_UPDATE: 'alert-circle-outline',
  EXPENSE_LOGGED: 'receipt',
  TENANT_JOINED: 'account-plus-outline',
  TENANT_LEFT: 'account-minus-outline',
  SYSTEM: 'bell-outline',
};

function NotificationItem({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const icon = KIND_ICONS[notification.kind] ?? 'bell-outline';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !notification.read && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconBox, !notification.read && styles.iconBoxUnread]}>
        <Icon name={icon} size={20} color={!notification.read ? colors.primary : colors.textSecondary} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Typography variant="bodyMedium" numberOfLines={2} style={[styles.title, !notification.read && styles.textUnread]}>
            {notification.title}
          </Typography>
          <Typography variant="caption" color="textTertiary">
            {formatRelative(notification.createdAt)}
          </Typography>
        </View>
        <Typography variant="caption" color="textSecondary" numberOfLines={2}>
          {notification.body}
        </Typography>
      </View>
    </Pressable>
  );
}

export function NotificationsScreen() {
  const property = useActiveProperty();
  const {
    data: notificationsData,
    isRefreshing,
    refresh,
    refetch,
  } = useNotifications(property.id);
  const notifications = notificationsData ?? [];

  const { run: runMark } = useAction();
  const { busy: isMarkingAll, run: runMarkAll } = useAction();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handlePress = (notification: AppNotification) => {
    if (!notification.read) {
      runMark(() => markNotificationRead(notification.id)).then(() => refetch());
    }
  };

  const handleMarkAll = () => {
    runMarkAll(() => markAllNotificationsRead(property.id)).then(() => refetch());
  };

  const renderItem = useCallback(
    ({ item, index }: { item: AppNotification; index: number }) => (
      <GroupedItem index={index} count={notifications.length} dividerInset={spacing.md + 38 + spacing.sm + 4}>
        <NotificationItem notification={item} onPress={() => handlePress(item)} />
      </GroupedItem>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications.length],
  );

  return (
    <Screen edges={[]} padded={false} background={colors.canvas}>
      {unreadCount > 0 && (
        <View style={styles.toolbar}>
          <Typography variant="caption" color="textSecondary">
            {unreadCount} unread
          </Typography>
          <Button
            title="Mark all read"
            variant="outline"
            size="sm"
            icon="check-all"
            loading={isMarkingAll}
            onPress={handleMarkAll}
          />
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        onRefresh={refresh}
        refreshing={isRefreshing}
        ListEmptyComponent={<EmptyState title="All caught up!" icon="bell-outline" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
    backgroundColor: colors.background,
  },
  cardUnread: {
    backgroundColor: '#F7F8FC',
  },
  cardPressed: {
    backgroundColor: colors.canvas,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUnread: {
    backgroundColor: colors.primaryLight,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  textUnread: {
    fontFamily: fontFamilies.semibold,
  },
});
