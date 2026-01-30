/**
 * Platform Context Provider
 *
 * Provides the platform adapter to all components via Solid.js context
 */

import { createContext, useContext, type ParentComponent } from "solid-js";
import type { IPlatformAdapter } from "./types";
import { getPlatformMode } from "./detection";
import { TauriAdapter } from "./tauri-adapter";
import { WebAdapter, type WebAdapterConfig } from "./web-adapter";

/**
 * Platform context
 */
const PlatformContext = createContext<IPlatformAdapter>();

/**
 * Platform provider props
 */
export interface PlatformProviderProps {
  /** Optional adapter override (for testing) */
  adapter?: IPlatformAdapter;

  /** Web adapter configuration */
  webConfig?: WebAdapterConfig;
}

/**
 * Platform Provider Component
 *
 * Automatically selects the appropriate adapter based on the runtime environment.
 * Can be overridden with a custom adapter for testing purposes.
 */
export const PlatformProvider: ParentComponent<PlatformProviderProps> = (props) => {
  // Use provided adapter or auto-detect
  const adapter = props.adapter ?? createPlatformAdapter(props.webConfig);

  return <PlatformContext.Provider value={adapter}>{props.children}</PlatformContext.Provider>;
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
 * @throws Error if used outside of PlatformProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const platform = usePlatform();
 *
 *   async function handleClick() {
 *     if (platform.capabilities.canManageEngine) {
 *       await platform.engineStart('/path/to/workspace');
 *     }
 *   }
 *
 *   return <button onClick={handleClick}>Start Engine</button>;
 * }
 * ```
 */
export function usePlatform(): IPlatformAdapter {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error("usePlatform must be used within a PlatformProvider");
  }

  return context;
}

/**
 * Hook to check if a specific capability is available
 *
 * @example
 * ```tsx
 * function EngineControls() {
 *   const canManage = usePlatformCapability('canManageEngine');
 *
 *   if (!canManage) {
 *     return <p>Engine management is not available in web mode</p>;
 *   }
 *
 *   return <button>Start Engine</button>;
 * }
 * ```
 */
export function usePlatformCapability(
  capability: keyof IPlatformAdapter["capabilities"],
): boolean {
  const platform = usePlatform();
  return platform.capabilities[capability];
}
