/**
 * Push notifications, biometric login and QR scanning abstractions.
 *
 * Implementation plan:
 * - push       -> expo-notifications (register token with the backend, map
 *                 payloads onto the in-app AppNotification feed)
 * - biometrics -> expo-local-authentication (gate app unlock / sign-in)
 * - qrScanner  -> expo-camera barcode scanning (bed/room QR lookup)
 */

import { notImplemented, type ServiceResult } from './types';

export interface PushNotificationService {
  /** Ask for permission and register the device push token. */
  register(): Promise<ServiceResult<{ token: string }>>;
  unregister(): Promise<void>;
}

export interface BiometricsService {
  /** Whether the device has enrolled biometrics we can use. */
  isSupported(): Promise<boolean>;
  /** Prompt for fingerprint/face unlock. */
  authenticate(promptTitle: string): Promise<ServiceResult<{ success: boolean }>>;
}

export interface QrScannerService {
  /** Scan a single QR code and resolve its payload. */
  scan(): Promise<ServiceResult<{ value: string }>>;
}

export const push: PushNotificationService = {
  async register() {
    return notImplemented('Push notifications');
  },
  async unregister() {
    // no-op until implemented
  },
};

export const biometrics: BiometricsService = {
  async isSupported() {
    return false;
  },
  async authenticate() {
    return notImplemented('Biometric login');
  },
};

export const qrScanner: QrScannerService = {
  async scan() {
    return notImplemented('QR scanning');
  },
};
