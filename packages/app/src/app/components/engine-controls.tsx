/**
 * Engine Controls Component
 *
 * Platform-aware engine management controls.
 * - Desktop: Direct engine start/stop/restart controls
 * - Web: Connection status and remote server info
 */

import { createSignal, Show, onMount, onCleanup } from "solid-js";
import { usePlatformAdapter } from "../lib/platform";
import type { EngineInfo } from "../lib/platform/types";

export interface EngineControlsProps {
  /** Current workspace directory (desktop mode) */
  workspaceDir?: string;

  /** Server URL (web mode) */
  serverUrl?: string;
}

export function EngineControls(props: EngineControlsProps) {
  const adapter = usePlatformAdapter();
  const [engineInfo, setEngineInfo] = createSignal<EngineInfo | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [showLogs, setShowLogs] = createSignal(false);

  // For web mode: check server connection status
  const [connectionStatus, setConnectionStatus] = createSignal<"connected" | "disconnected" | "checking">("checking");

  let statusCheckInterval: number | undefined;

  onMount(async () => {
    await refreshEngineStatus();

    // Check status periodically
    statusCheckInterval = window.setInterval(() => {
      refreshEngineStatus();
    }, 5000); // Every 5 seconds
  });

  onCleanup(() => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
  });

  async function refreshEngineStatus() {
    try {
      if (adapter.capabilities.canManageEngine) {
        // Desktop mode: Get engine info
        const info = await adapter.engineInfo();
        setEngineInfo(info);
        setError(null);
      } else {
        // Web mode: Check server connection
        if (props.serverUrl) {
          const response = await fetch(`${props.serverUrl}/health`, {
            signal: AbortSignal.timeout(3000),
          });
          if (response.ok) {
            setConnectionStatus("connected");
            setError(null);
          } else {
            setConnectionStatus("disconnected");
          }
        }
      }
    } catch (err) {
      if (adapter.capabilities.canManageEngine) {
        setError("Failed to get engine status");
      } else {
        setConnectionStatus("disconnected");
      }
    }
  }

  async function handleStart() {
    if (!props.workspaceDir) {
      setError("No workspace directory specified");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const info = await adapter.engineStart(props.workspaceDir);
      setEngineInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start engine");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStop() {
    setIsLoading(true);
    setError(null);

    try {
      const info = await adapter.engineStop();
      setEngineInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop engine");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRestart() {
    if (!props.workspaceDir) {
      setError("No workspace directory specified");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Stop then start
      await adapter.engineStop();
      const info = await adapter.engineStart(props.workspaceDir);
      setEngineInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restart engine");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleViewLogs() {
    setShowLogs(true);
  }

  // Desktop mode controls
  const desktopControls = (
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          Engine Status
        </h3>
        <div class="flex items-center gap-2">
          <div
            class="w-2 h-2 rounded-full"
            classList={{
              "bg-green-500": engineInfo()?.status === "running",
              "bg-red-500": engineInfo()?.status === "stopped",
              "bg-yellow-500": engineInfo()?.status === "starting",
              "bg-gray-400": !engineInfo(),
            }}
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {engineInfo()?.status || "Unknown"}
          </span>
        </div>
      </div>

      <Show when={error()}>
        <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p class="text-sm text-red-800 dark:text-red-200">{error()}</p>
        </div>
      </Show>

      <Show when={engineInfo()}>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">PID:</span>
            <span class="font-mono text-gray-900 dark:text-white">
              {engineInfo()?.pid || "N/A"}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Port:</span>
            <span class="font-mono text-gray-900 dark:text-white">
              {engineInfo()?.port || "N/A"}
            </span>
          </div>
          <Show when={engineInfo()?.logPath}>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Log Path:</span>
              <span class="font-mono text-xs text-gray-900 dark:text-white truncate max-w-xs">
                {engineInfo()?.logPath}
              </span>
            </div>
          </Show>
        </div>
      </Show>

      <div class="flex gap-2">
        <Show
          when={engineInfo()?.status === "running"}
          fallback={
            <button
              onClick={handleStart}
              disabled={isLoading()}
              class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isLoading() ? "Starting..." : "Start Engine"}
            </button>
          }
        >
          <button
            onClick={handleStop}
            disabled={isLoading()}
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isLoading() ? "Stopping..." : "Stop Engine"}
          </button>
        </Show>

        <button
          onClick={handleRestart}
          disabled={isLoading() || engineInfo()?.status !== "running"}
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          Restart
        </button>

        <button
          onClick={handleViewLogs}
          disabled={!engineInfo()?.logPath}
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          title="View Logs"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  // Web mode controls
  const webControls = (
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          Server Connection
        </h3>
        <div class="flex items-center gap-2">
          <div
            class="w-2 h-2 rounded-full animate-pulse"
            classList={{
              "bg-green-500": connectionStatus() === "connected",
              "bg-red-500": connectionStatus() === "disconnected",
              "bg-yellow-500": connectionStatus() === "checking",
            }}
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {connectionStatus() === "connected" && "Connected"}
            {connectionStatus() === "disconnected" && "Disconnected"}
            {connectionStatus() === "checking" && "Checking..."}
          </span>
        </div>
      </div>

      <Show when={error()}>
        <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p class="text-sm text-red-800 dark:text-red-200">{error()}</p>
        </div>
      </Show>

      <Show when={props.serverUrl}>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Server URL:</span>
            <span class="font-mono text-gray-900 dark:text-white text-xs">
              {props.serverUrl}
            </span>
          </div>
        </div>
      </Show>

      <div class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <p class="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Engine management is handled by the OpenCode server.
          The engine runs in a container managed by the server.
        </p>
      </div>

      <button
        onClick={refreshEngineStatus}
        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Refresh Status
      </button>
    </div>
  );

  return (
    <>
      <Show when={adapter.capabilities.canManageEngine} fallback={webControls}>
        {desktopControls}
      </Show>

      {/* Log Viewer Modal */}
      <Show when={showLogs()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Engine Logs
              </h3>
              <button
                onClick={() => setShowLogs(false)}
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div class="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded-md overflow-auto max-h-[70vh]">
              <p class="text-gray-400">
                Log viewing will be implemented. Path: {engineInfo()?.logPath}
              </p>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
