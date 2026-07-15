/**
 * Shared result types for device-capability services.
 *
 * Every service returns a discriminated result instead of throwing, so
 * screens can already branch on `available` today and keep that exact code
 * when the real implementations land.
 */

/** A capability that is designed but not yet implemented on this build. */
export interface Unavailable {
  available: false;
  /** Why the capability is unavailable (surfaced to the user verbatim). */
  reason: string;
}

export type ServiceResult<T> = ({ available: true } & T) | Unavailable;

export const notImplemented = (feature: string): Unavailable => ({
  available: false,
  reason: `${feature} will be enabled in a future build.`,
});

/** A picked or captured file, normalised across camera/gallery/documents. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  /** Bytes, when the source reports it. */
  size?: number;
}
