/**
 * Feature data hooks — one per backend query, named after it. Screens depend
 * on these hooks for reads from the authenticated server snapshot.
 */

import {
  getAssignableUsers,
  getCollectionsData,
  getRentCollection,
  getRentReport,
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
} from '@/data';
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
    [floorId], { enabled: !!floorId },
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

/** Dues for one billing month (YYYY-MM; the current month when omitted). */
export function useCollections(propertyId: string, month?: string, enabled = true) {
  return useAsyncData(() => getCollectionsData(propertyId, month), [propertyId, month], { enabled });
}

/** One tenancy's rent position for a month — the Collect Rent sheet. */
export function useRentCollection(tenancyId: string | null, month?: string) {
  return useAsyncData(
    () => (tenancyId ? getRentCollection(tenancyId, month) : null),
    [tenancyId, month], { enabled: !!tenancyId },
  );
}

export function useRentReport(propertyId: string, month?: string) {
  return useAsyncData(() => getRentReport(propertyId, month), [propertyId, month]);
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

export function useAssignableUsers(propertyId: string, enabled = true) {
  return useAsyncData(() => getAssignableUsers(propertyId), [propertyId], { enabled });
}

export function useExpenses(propertyId: string) {
  return useAsyncData(() => getExpenses(propertyId), [propertyId]);
}

export function useExpense(expenseId: string) {
  return useAsyncData(() => getExpense(expenseId), [expenseId]);
}

export function useExpenseCategories(propertyId: string, enabled = true) {
  return useAsyncData(() => getExpenseCategories(propertyId), [propertyId], { enabled });
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
