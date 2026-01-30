/**
 * Platform Abstraction Layer
 *
 * Provides a unified interface for platform-specific operations,
 * enabling the app to run on both desktop (Tauri) and web (browser).
 *
 * Note: This is separate from app/context/platform.tsx which handles
 * basic platform operations (storage, links, notifications).
 *
 * @module platform
 */

// Types
export type {
  IPlatformAdapter,
  PlatformCapabilities,
  DirectoryPickerOptions,
  FilePickerOptions,
  SaveDialogOptions,
} from "./types";

// Detection utilities
export {
  isTauriRuntime,
  getPlatformMode,
  hasFileSystemAccess,
  hasServiceWorker,
  hasWebSocket,
  hasIndexedDB,
  getBrowserInfo,
  checkBrowserCompatibility,
  type PlatformMode,
} from "./detection";

// Adapters
export { TauriAdapter } from "./tauri-adapter";
export { WebAdapter, type WebAdapterConfig } from "./web-adapter";

// Context and hooks
export {
  PlatformAdapterProvider,
  usePlatformAdapter,
  useAdapterCapability,
  type PlatformAdapterProviderProps,
} from "./context";
