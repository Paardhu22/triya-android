import { appendPickedFile } from '@/services/media';
import type { PickedFile } from '@/services/types';
import type { Role } from '@/types';
import { request } from './client';
import { markRead, notifyDbChanged } from './db';
import type * as T from './types';

async function mutate<R = undefined>(action: string, ...args: unknown[]): Promise<T.ActionResult<R>> {
  return sendMutation<R>(action, args);
}
async function sendMutation<R>(action: string, args: unknown[], attachment?: PickedFile | null): Promise<T.ActionResult<R>> {
  try {
    let body: string | FormData = JSON.stringify({ action, args });
    if (attachment) {
      const multipart = new FormData(); multipart.set('payload', body);
      await appendPickedFile(multipart, 'attachment', attachment); body = multipart;
    }
    const result = await request<T.ActionResult<R>>('actions', { method: 'POST', body });
    // Some actions commit a row before an invoice/delivery failure. Refresh either outcome.
    notifyDbChanged();
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not reach the server' };
  }
}
export const collectRent = (input: T.CollectRentInput) => mutate<T.CollectRentResult>('collectRent', input);
export const deleteRentCollection = (id: string, _role?: Role) => mutate('deleteRentCollection', id);
export const sendRentReminder = (id: string) => mutate<{ tenantName: string }>('sendRentReminder', id);
export const remindAllTenants = (_propertyId: string) => mutate<T.ReminderBatchResult>('remindAllTenants');
export const remindPendingTenants = (_propertyId: string) => mutate<T.ReminderBatchResult>('remindPendingTenants');
export const sendInvoice = (input: T.SendInvoiceInput) => mutate<{ number: string }>('sendInvoice', input);
export const resendInvoice = (id: string) => mutate('resendInvoice', id);
export const setRoomRent = (input: T.SetRoomRentInput, _role?: Role) => mutate<{ updatedTenancies: number }>('setRoomRent', input);
export const createComplaint = (input: T.CreateComplaintInput) => mutate('createComplaint', input);
export const updateComplaint = (id: string, patch: T.UpdateComplaintInput) => mutate('updateComplaint', id, patch);
export const createExpense = (input: T.CreateExpenseInput, receipt?: PickedFile | null) => sendMutation<undefined>('createExpense', [input], receipt);
export const deleteExpense = (id: string) => mutate('deleteExpense', id);
export const assignTenantToBed = (input: T.AssignTenantInput, photo?: PickedFile | null) => sendMutation<{ tenantId: string; invoice: T.IssuedInvoice | null }>('assignTenantToBed', [input], photo);
export const giveNotice = (id: string) => mutate<{ vacateBy: string }>('giveNotice', id);
export const vacateBed = (id: string) => mutate<{ depositStatus: string }>('vacateBed', id);
export const deleteTenant = (id: string) => mutate('deleteTenant', id);
export const sendRules = (id: string) => mutate<{ tenantName: string }>('sendRules', id);
export const updatePropertySettings = (id: string, input: T.UpdatePropertySettingsInput) => mutate('updatePropertySettings', id, input);
export const changePassword = (email: string, current: string, next: string) => mutate('changePassword', email, current, next);
// Activity is derived from real records; read markers are local to this app session.
export async function markNotificationRead(id: string): Promise<T.ActionResult> { markRead(id); return { ok: true, data: undefined }; }
export async function markAllNotificationsRead(_propertyId: string): Promise<T.ActionResult> { markRead(); return { ok: true, data: undefined }; }

export const createCategory = (name: string) => mutate('createCategory', { name });
export const renameCategory = (id: string, name: string) => mutate('renameCategory', { id, name });
export const deleteCategory = (id: string) => mutate('deleteCategory', { id });
export const createSubcategory = (categoryId: string, name: string) => mutate('createSubcategory', { categoryId, name });
export const renameSubcategory = (id: string, name: string) => mutate('renameSubcategory', { id, name });
export const deleteSubcategory = (id: string) => mutate('deleteSubcategory', { id });
