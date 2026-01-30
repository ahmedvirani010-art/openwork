/**
 * Platform Adapter Context Provider
 *
 * Provides the platform adapter to all components via Solid.js context.
 * Note: This is separate from app/context/platform.tsx which handles basic platform operations.
 */

import { createContext, useContext, type ParentComponent } from "solid-js";
import type { IPlatformAdapter } from "./types";
import { getPlatformMode } from "./detection";
import { TauriAdapter } from "./tauri-adapter";
import { WebAdapter, type WebAdapterConfig } from "./web-adapter";

/**
 * Platform Adapter context
 */
const PlatformAdapterContext = createContext<IPlatformAdapter>();

/**
 * Platform Adapter provider props
 */
export interface PlatformAdapterProviderProps {
  /** Optional adapter override (for testing) */
  adapter?: IPlatformAdapter;

  /** Web adapter configuration */
  webConfig?: WebAdapterConfig;
}

/**
 * Platform Adapter Provider Component
 *
 * Automatically selects the appropriate adapter based on the runtime environment.
 * Can be overridden with a custom adapter for testing purposes.
 */
export const PlatformAdapterProvider: ParentComponent<PlatformAdapterProviderProps> = (props) => {
  // Use provided adapter or auto-detect
  const adapter = props.adapter ?? createPlatformAdapter(props.webConfig);

  return <PlatformAdapterContext.Provider value={adapter}>{props.children}</PlatformAdapterContext.Provider>;
};

/**
 * Create platform adapter based on current environment
 */
function createPlatformAdapter(webConfig?: WebAdapterConfig): IPlatformAdapter {
  const mode = getPlatformMode();

  if (mode === "desktop") {
    return new TauriAdapter();
  } else {
    return new WebAdapter(webConfig);
  }
}

/**
 * Hook to access platform adapter
 *
 * @throws Error if used outside of PlatformAdapterProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const adapter = usePlatformAdapter();
 *
 *   async function handleClick() {
 *     if (adapter.capabilities.canManageEngine) {
 *       await adapter.engineStart('/path/to/workspace');
 *     }
 *   }
 *
 *   return <button onClick={handleClick}>Start Engine</button>;
 * }
 * ```
 */
export function usePlatformAdapter(): IPlatformAdapter {
  const context = useContext(PlatformAdapterContext);

  if (!context) {
    throw new Error("usePlatformAdapter must be used within a PlatformAdapterProvider");
  }

  return context;
}

/**
 * Hook to check if a specific capability is available
 *
 * @example
 * ```tsx
 * function EngineControls() {
 *   const canManage = useAdapterCapability('canManageEngine');
 *
 *   if (!canManage) {
 *     return <p>Engine management is not available in web mode</p>;
 *   }
 *
 *   return <button>Start Engine</button>;
 * }
 * ```
 */
export function useAdapterCapability(
  capability: keyof IPlatformAdapter["capabilities"],
): boolean {
  const adapter = usePlatformAdapter();
  return adapter.capabilities[capability];
}
