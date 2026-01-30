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

import type { IPlatformAdapter } from "./types";
import { TauriAdapter } from "./tauri-adapter";
import { WebAdapter } from "./web-adapter";
import { getPlatformMode } from "./detection";

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

// File transfer utilities (web mode)
export * from "../file-transfer";

// Context and hooks
export {
  PlatformAdapterProvider,
  usePlatformAdapter,
  useAdapterCapability,
  type PlatformAdapterProviderProps,
} from "./context";

// Helper function to create the appropriate adapter
export function createPlatformAdapter(webConfig?: import("./web-adapter").WebAdapterConfig): IPlatformAdapter {
  const mode = getPlatformMode();
  if (mode === "desktop") {
    return new TauriAdapter();
  } else {
    return new WebAdapter(webConfig);
  }
}
