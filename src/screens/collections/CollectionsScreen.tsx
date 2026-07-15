import { useCallback, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FilterChips } from '@/components/FilterChips';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SkeletonCardList } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { Typography } from '@/components/Typography';
import { CollectionCard } from '@/components/cards/CollectionCard';
import { InvoiceCard } from '@/components/cards/InvoiceCard';
import { enterItem } from '@/components/motion';
import { MarkPaidFlow } from '@/screens/collections/MarkPaidFlow';
import { SendInvoiceSheet } from '@/screens/collections/SendInvoiceSheet';
import { TabHeader } from '@/screens/shared/TabHeader';
import { useAction, useCollections, useCollectionsSummary, useInvoiceHistory } from '@/hooks';
import { remindEveryone, resendInvoice, sendRentReminder } from '@/mocks/actions';
import type { CollectionRow, InvoiceHistoryRow } from '@/mocks';
import type { PaymentStatus } from '@/types';
import { useActiveProperty } from '@/store';
import { colors, spacing } from '@/theme';
import { currentCycleDuePaise, formatINR } from '@/utils';

type StatusFilter = 'ALL' | PaymentStatus;

/**
 * CollectionsScreen
 *
 * The web collections page on mobile: the Dues / Invoice History tabs,
 * search + payment-status filter, per-tenant remind / mark-paid / send-
 * invoice actions, the Remind-everyone bulk action, and the invoice
 * history with resend. Summary tiles mirror the paid/outstanding split.
 */
export function CollectionsScreen() {
  const property = useActiveProperty();
  const {
    data: summary,
    refetch: refetchSummary,
  } = useCollectionsSummary(property.id);
  const {
    data: collectionsData,
    isLoading: collectionsLoading,
    error: collectionsError,
    isRefreshing,
    refresh,
    refetch: refetchCollections,
  } = useCollections(property.id);
  const collections = useMemo(() => collectionsData ?? [], [collectionsData]);
  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    isRefreshing: invoicesRefreshing,
    refresh: refreshInvoices,
    refetch: refetchInvoices,
  } = useInvoiceHistory(property.id);
  const invoices = useMemo(() => invoicesData ?? [], [invoicesData]);

  const [segment, setSegment] = useState<'DUES' | 'INVOICES'>('DUES');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Modals state
  const [markPaidTenancyId, setMarkPaidTenancyId] = useState<string | null>(null);
  const [sendInvoiceTenancyId, setSendInvoiceTenancyId] = useState<string | null>(null);
  const [remindAllOpen, setRemindAllOpen] = useState(false);

  // Actions
  const { busy: isReminding, run: runRemind } = useAction();
  const { busy: isResending, run: runResend } = useAction();
  const { busy: isRemindingAll, run: runRemindAll } = useAction();

  const refetchAll = useCallback(() => {
    refetchCollections();
    refetchInvoices();
    refetchSummary();
  }, [refetchCollections, refetchInvoices, refetchSummary]);

  const filteredCollections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collections.filter((c) => {
      if (statusFilter !== 'ALL' && c.paymentStatus !== statusFilter) return false;
      if (
        q &&
        !`${c.tenant.fullName} ${c.tenant.phone} ${c.roomNumber}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [collections, search, statusFilter]);

  const filteredInvoices = useMemo(() => {
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (i) =>
        i.tenantName.toLowerCase().includes(q) ||
        i.roomNumber.toLowerCase().includes(q) ||
        i.number.toLowerCase().includes(q),
    );
  }, [invoices, search]);

  const unpaidCount = useMemo(
    () => collections.filter((c) => c.paymentStatus !== 'PAID').length,
    [collections],
  );

  const handleRemind = (tenancyId: string) => {
    runRemind(() => sendRentReminder(tenancyId)).then((res) => {
      if (res.ok) {
        Alert.alert('Reminder sent', `Rent reminder sent to ${res.data.tenantName} on WhatsApp.`);
      } else {
        Alert.alert('Error', res.error);
      }
    });
  };

  const handleRemindAll = async () => {
    const res = await runRemindAll(() => remindEveryone(property.id));
    setRemindAllOpen(false);
    if (res.ok) {
      Alert.alert('Reminders sent', `Rent reminders sent to ${res.data.count} tenants.`);
    } else {
      Alert.alert('Error', res.error);
    }
  };

  const handleResendInvoice = (invoiceId: string) => {
    runResend(() => resendInvoice(invoiceId)).then((res) => {
      if (res.ok) {
        Alert.alert('Invoice resent', 'Invoice resent on WhatsApp.');
        refetchInvoices();
      } else {
        Alert.alert('Error', res.error);
      }
    });
  };

  const activeTenancy = collections.find(
    (c) => c.id === (markPaidTenancyId || sendInvoiceTenancyId),
  );

  const renderCollection = useCallback(
    ({ item, index }: { item: CollectionRow; index: number }) => (
      <Animated.View entering={enterItem(index)}>
        <CollectionCard
          row={item}
          isFlat={property.isFlat}
          onRemind={() => handleRemind(item.id)}
          onMarkPaid={() => setMarkPaidTenancyId(item.id)}
          onSendInvoice={() => setSendInvoiceTenancyId(item.id)}
          busy={isReminding}
        />
      </Animated.View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [property.isFlat, isReminding],
  );

  const renderInvoice = useCallback(
    ({ item, index }: { item: InvoiceHistoryRow; index: number }) => (
      <Animated.View entering={enterItem(index)}>
        <InvoiceCard
          invoice={item}
          isFlat={property.isFlat}
          onResend={() => handleResendInvoice(item.id)}
          resending={isResending}
        />
      </Animated.View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [property.isFlat, isResending],
  );

  const listLoading = segment === 'DUES' ? collectionsLoading : invoicesLoading;

  return (
    <Screen edges={['top']} padded={false}>
      <TabHeader title="Collections" />

      <View style={styles.header}>
        <View style={styles.summaryRow}>
          <StatCard
            label="Collected"
            value={summary ? formatINR(summary.collectedPaise) : '₹0'}
            caption={summary ? `${summary.paidCount} paid` : ''}
            icon="check-circle"
            accentColor={colors.success}
            accentSoftColor={colors.successLight}
          />
          <StatCard
            label="Outstanding"
            value={summary ? formatINR(summary.outstandingPaise) : '₹0'}
            caption={summary ? `${summary.unpaidCount} unpaid` : ''}
            icon="clock-outline"
            accentColor={colors.warning}
            accentSoftColor={colors.warningLight}
          />
        </View>

        <SegmentedControl
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'DUES', label: 'Dues' },
            { value: 'INVOICES', label: 'Invoice History' },
          ]}
        />

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={
            segment === 'DUES' ? 'Search name, phone or room' : 'Search tenant, room or invoice #'
          }
        />

        {segment === 'DUES' && (
          <View style={styles.filterRow}>
            <FilterChips
              value={statusFilter}
              onChange={setStatusFilter}
              style={styles.filters}
              options={[
                { value: 'ALL', label: 'All' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'OVERDUE', label: 'Overdue' },
                { value: 'PAID', label: 'Paid' },
              ]}
            />
            {unpaidCount > 0 && (
              <Button
                title="Remind all"
                variant="outline"
                size="sm"
                icon="bell-ring-outline"
                onPress={() => setRemindAllOpen(true)}
              />
            )}
          </View>
        )}
      </View>

      {listLoading ? (
        <View style={styles.skeletons}>
          <SkeletonCardList rows={5} />
        </View>
      ) : collectionsError && !collectionsData ? (
        <ErrorState message={collectionsError} onRetry={refetchCollections} />
      ) : segment === 'DUES' ? (
        <FlatList
          data={filteredCollections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderCollection}
          onRefresh={refresh}
          refreshing={isRefreshing}
          ListEmptyComponent={
            <EmptyState
              icon="inbox-outline"
              title={
                collections.length === 0
                  ? 'No active tenants found for this property.'
                  : 'No tenants match your filters.'
              }
            />
          }
          ListFooterComponent={
            filteredCollections.length > 0 ? (
              <Typography variant="small" color="textTertiary" style={styles.footerCount}>
                {filteredCollections.length} of {collections.length} active tenants
              </Typography>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderInvoice}
          onRefresh={refreshInvoices}
          refreshing={invoicesRefreshing}
          ListEmptyComponent={
            <EmptyState
              icon="receipt"
              title={
                invoices.length === 0
                  ? 'No invoices have been generated for this property yet.'
                  : 'No invoices match your search.'
              }
            />
          }
          ListFooterComponent={
            filteredInvoices.length > 0 ? (
              <Typography variant="small" color="textTertiary" style={styles.footerCount}>
                {filteredInvoices.length} of {invoices.length} invoices
              </Typography>
            ) : null
          }
        />
      )}

      {markPaidTenancyId && activeTenancy && (
        <MarkPaidFlow
          visible={true}
          tenancyId={markPaidTenancyId}
          tenantName={activeTenancy.tenant.fullName}
          amountPaise={currentCycleDuePaise(activeTenancy)}
          isFlat={property.isFlat}
          onClose={() => {
            setMarkPaidTenancyId(null);
            refetchAll();
          }}
        />
      )}

      <SendInvoiceSheet
        visible={!!sendInvoiceTenancyId}
        tenancyId={sendInvoiceTenancyId}
        isFlat={property.isFlat}
        onClose={() => {
          setSendInvoiceTenancyId(null);
          refetchInvoices();
        }}
      />

      <ConfirmDialog
        visible={remindAllOpen}
        title="Remind everyone"
        message={`Send a WhatsApp rent reminder to all ${unpaidCount} tenants with unpaid dues?`}
        confirmLabel="Send reminders"
        loading={isRemindingAll}
        onConfirm={handleRemindAll}
        onCancel={() => setRemindAllOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filters: {
    flex: 1,
    paddingBottom: 0,
  },
  skeletons: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  footerCount: {
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
});
