import { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatCard } from '@/components/StatCard';
import { CollectionCard } from '@/components/cards/CollectionCard';
import { InvoiceCard } from '@/components/cards/InvoiceCard';
import { MarkPaidFlow } from '@/screens/collections/MarkPaidFlow';
import { SendInvoiceSheet } from '@/screens/collections/SendInvoiceSheet';
import { TabHeader } from '@/screens/shared/TabHeader';
import { useAction, useCollections, useCollectionsSummary, useInvoiceHistory } from '@/hooks';
import { resendInvoice, sendRentReminder } from '@/mocks/actions';
import { useActiveProperty } from '@/store';
import { spacing } from '@/theme';
import { currentCycleDuePaise, formatINR } from '@/utils';

export function CollectionsScreen() {
  const property = useActiveProperty();
  const { data: summary } = useCollectionsSummary(property.id);
  const { data: collectionsData, refetch: refetchCollections } = useCollections(property.id);
  const collections = collectionsData || [];
  const { data: invoicesData, refetch: refetchInvoices } = useInvoiceHistory(property.id);
  const invoices = invoicesData || [];

  const [segment, setSegment] = useState<'DUES' | 'INVOICES'>('DUES');
  const [search, setSearch] = useState('');

  // Modals state
  const [markPaidTenancyId, setMarkPaidTenancyId] = useState<string | null>(null);
  const [sendInvoiceTenancyId, setSendInvoiceTenancyId] = useState<string | null>(null);

  // Actions
  const { busy: isReminding, run: runRemind } = useAction();
  const { busy: isResending, run: runResend } = useAction();

  const filteredCollections = useMemo(() => {
    if (!search) return collections;
    const q = search.toLowerCase();
    return collections.filter((c) => 
      c.tenant.fullName.toLowerCase().includes(q) || 
      c.roomNumber.toLowerCase().includes(q)
    );
  }, [collections, search]);

  const filteredInvoices = useMemo(() => {
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter((i) => 
      i.tenantName.toLowerCase().includes(q) || 
      i.roomNumber.toLowerCase().includes(q) ||
      i.number.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const handleRemind = (tenancyId: string) => {
    runRemind(() => sendRentReminder(tenancyId)).then((res) => {
      if (res.ok) {
        Alert.alert('Success', `Reminder sent to ${res.data.tenantName}`);
      } else {
        Alert.alert('Error', res.error);
      }
    });
  };

  const handleResendInvoice = (invoiceId: string) => {
    runResend(() => resendInvoice(invoiceId)).then((res) => {
      if (res.ok) {
        Alert.alert('Success', 'Invoice resent on WhatsApp');
        refetchInvoices();
      } else {
        Alert.alert('Error', res.error);
      }
    });
  };

  const activeTenancy = collections.find((c) => c.id === (markPaidTenancyId || sendInvoiceTenancyId));

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
            accentColor="#10B981"
            accentSoftColor="#D1FAE5"
          />
          <StatCard
            label="Outstanding"
            value={summary ? formatINR(summary.outstandingPaise) : '₹0'}
            caption={summary ? `${summary.unpaidCount} unpaid` : ''}
            icon="clock-outline"
            accentColor="#F59E0B"
            accentSoftColor="#FEF3C7"
          />
        </View>

        <SegmentedControl
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'DUES', label: 'Current Dues' },
            { value: 'INVOICES', label: 'Invoices' }
          ]}
        />
        
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, room or invoice..."
        />
      </View>

      {segment === 'DUES' ? (
        <FlatList
          data={filteredCollections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <CollectionCard
              row={item}
              isFlat={!property.hasBlocks}
              onRemind={() => handleRemind(item.id)}
              onMarkPaid={() => setMarkPaidTenancyId(item.id)}
              onSendInvoice={() => setSendInvoiceTenancyId(item.id)}
              busy={isReminding}
            />
          )}
          ListEmptyComponent={<EmptyState title={search ? "No dues match your search" : "No dues found"} />}
        />
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <InvoiceCard
              invoice={item}
              isFlat={!property.hasBlocks}
              onResend={() => handleResendInvoice(item.id)}
              resending={isResending}
            />
          )}
          ListEmptyComponent={<EmptyState title={search ? "No invoices match your search" : "No invoices found"} icon="receipt" />}
        />
      )}

      {markPaidTenancyId && activeTenancy && (
        <MarkPaidFlow
          visible={true}
          tenancyId={markPaidTenancyId}
          tenantName={activeTenancy.tenant.fullName}
          amountPaise={currentCycleDuePaise(activeTenancy)}
          isFlat={!property.hasBlocks}
          onClose={() => {
            setMarkPaidTenancyId(null);
            refetchCollections();
            refetchInvoices();
          }}
        />
      )}

      <SendInvoiceSheet
        visible={!!sendInvoiceTenancyId}
        tenancyId={sendInvoiceTenancyId}
        isFlat={!property.hasBlocks}
        onClose={() => {
          setSendInvoiceTenancyId(null);
          refetchInvoices();
        }}
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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
});
