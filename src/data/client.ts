import { DEFAULT_UPLOAD_POLICY, type UploadPolicy } from '@/utils/uploadPolicy';
import type { User, Property } from '@/types';

export interface Session { token: string; expires: string; user: User }
export type AccessibleProperty = Property & { stats: { totalRooms: number; totalBeds: number; occupiedBeds: number } };
let session: Session | null = null;
let propertyId: string | null = null;
let uploadPolicy = DEFAULT_UPLOAD_POLICY;
let developmentApiUrl: string | null = null;
let sessionGeneration = 0;
const imageUrls = new Map<string, { url: string; expires: number }>();
const pendingImageUrls = new Map<string, Promise<string>>();
export const getUploadPolicy = () => uploadPolicy;
export function setUploadPolicy(value?: UploadPolicy) { uploadPolicy = value ?? DEFAULT_UPLOAD_POLICY; }
export function setDevelopmentApiUrl(value: string) { developmentApiUrl = value; }
const expiredListeners = new Set<() => void>();

export function setSession(value: Session | null) { session = value; sessionGeneration++; imageUrls.clear(); pendingImageUrls.clear(); setUploadPolicy(); }
export function setActiveProperty(id: string | null) { propertyId = id; }
export function activePropertyId() { return propertyId; }
export function subscribeSessionExpired(fn: () => void) { expiredListeners.add(fn); return () => { expiredListeners.delete(fn); }; }

export function apiBaseUrl() {
  const url = (process.env.EXPO_PUBLIC_API_URL?.trim() || developmentApiUrl)?.replace(/\/$/, '');
  if (!url || !/^https?:\/\//.test(url)) throw new Error('Set EXPO_PUBLIC_API_URL to your Triya Manager server URL.');
  return url;
}
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 30_000);
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const token = session?.token;
  try {
    const response = await fetch(`${apiBaseUrl()}/api/mobile/${path}`, {
      ...options, signal: controller.signal,
      headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(propertyId ? { 'X-Triya-Property': propertyId } : {}), ...options.headers },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && token && token === session?.token) expiredListeners.forEach(fn => fn());
      throw new Error(data?.error ?? `Request failed (${response.status})`);
    }
    if (data === null) throw new Error('The server returned an invalid JSON response. Please try again.');
    return data as T;
  } catch (error) {
    if (timedOut) throw new Error('The server took too long to respond. Please try again.');
    throw error;
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', abort); }
}

export async function storedFileUrl(key: string, logoPropertyId?: string) {
  const cacheKey = `${sessionGeneration}:${logoPropertyId ?? propertyId}:${key}`;
  const cached = imageUrls.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.url;
  const pending = pendingImageUrls.get(cacheKey);
  if (pending) return pending;
  const generation = sessionGeneration;
  const query = new URLSearchParams({ key });
  if (logoPropertyId) query.set('logoPropertyId', logoPropertyId);
  const task = request<{ path: string }>(`file?${query}`).then(({ path }) => {
    const url = `${apiBaseUrl()}${path}`;
    if (generation === sessionGeneration) imageUrls.set(cacheKey, { url, expires: Date.now() + 8 * 60 * 1000 });
    return url;
  });
  pendingImageUrls.set(cacheKey, task);
  try { return await task; }
  finally { if (pendingImageUrls.get(cacheKey) === task) pendingImageUrls.delete(cacheKey); }
}
export async function openStoredFile(key: string) {
  const url = await storedFileUrl(key);
  const { openBrowserAsync } = await import('expo-web-browser');
  await openBrowserAsync(url);
}
