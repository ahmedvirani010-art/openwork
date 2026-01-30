/**
 * Platform Abstraction Layer
 *
 * Provides a unified interface for platform-specific operations,
 * enabling the app to run on both desktop (Tauri) and web (browser).
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
  PlatformProvider,
  usePlatform,
  usePlatformCapability,
  type PlatformProviderProps,
} from "./context";
