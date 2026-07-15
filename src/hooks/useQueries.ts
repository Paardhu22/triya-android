/**
 * Feature data hooks — one per backend query, named after it. Screens depend
 * on these (never on the mock module directly), so swapping the data source
 * touches exactly one layer.
 */

import {
  getAssignableUsers,
  getCollections,
  getCollectionsSummary,
  getComplaint,
  getComplaints,
  getDashboardData,
  getExpense,
  getExpenseCategories,
  getExpenses,
  getFloorLayout,
  getFloorNavigation,
  getInvoiceHistory,
  getNotifications,
  getPropertyStats,
  getRoomDetail,
  getRoomOptions,
  getTenantList,
  getTenantProfile,
  getUnreadNotificationCount,
} from '@/mocks';
import { useAsyncData } from './useAsyncData';

export function useDashboard(propertyId: string) {
  return useAsyncData(() => getDashboardData(propertyId), [propertyId]);
}

export function usePropertyStats(propertyId: string) {
  return useAsyncData(() => getPropertyStats(propertyId), [propertyId]);
}

export function useFloorNavigation(propertyId: string) {
  return useAsyncData(() => getFloorNavigation(propertyId), [propertyId]);
}

export function useFloorLayout(floorId: string | null) {
  return useAsyncData(
    () => (floorId ? getFloorLayout(floorId) : []),
    [floorId],
  );
}

export function useRoomDetail(roomId: string) {
  return useAsyncData(() => getRoomDetail(roomId), [roomId]);
}

export function useTenants(propertyId: string) {
  return useAsyncData(() => getTenantList(propertyId), [propertyId]);
}

export function useTenantProfile(tenantId: string) {
  return useAsyncData(() => getTenantProfile(tenantId), [tenantId]);
}

export function useCollections(propertyId: string) {
  return useAsyncData(() => getCollections(propertyId), [propertyId]);
}

export function useCollectionsSummary(propertyId: string) {
  return useAsyncData(() => getCollectionsSummary(propertyId), [propertyId]);
}

export function useInvoiceHistory(propertyId: string) {
  return useAsyncData(() => getInvoiceHistory(propertyId), [propertyId]);
}

export function useComplaints(propertyId: string) {
  return useAsyncData(() => getComplaints(propertyId), [propertyId]);
}

export function useComplaint(complaintId: string) {
  return useAsyncData(() => getComplaint(complaintId), [complaintId]);
}

export function useAssignableUsers(propertyId: string) {
  return useAsyncData(() => getAssignableUsers(propertyId), [propertyId]);
}

export function useExpenses(propertyId: string) {
  return useAsyncData(() => getExpenses(propertyId), [propertyId]);
}

export function useExpense(expenseId: string) {
  return useAsyncData(() => getExpense(expenseId), [expenseId]);
}

export function useExpenseCategories(propertyId: string) {
  return useAsyncData(() => getExpenseCategories(propertyId), [propertyId]);
}

export function useNotifications(propertyId: string) {
  return useAsyncData(() => getNotifications(propertyId), [propertyId]);
}

export function useUnreadNotificationCount(propertyId: string) {
  return useAsyncData(() => getUnreadNotificationCount(propertyId), [propertyId]);
}

export function useRoomOptions(propertyId: string) {
  return useAsyncData(() => getRoomOptions(propertyId), [propertyId]);
}
