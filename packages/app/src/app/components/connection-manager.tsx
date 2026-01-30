/**
 * Connection Manager Component
 *
 * Allows web users to connect to remote OpenCode servers.
 * Provides saved connections, connection testing, and manual input.
 */

import { createSignal, For, Show, createEffect } from "solid-js";
import { usePlatformAdapter } from "../lib/platform";

export interface SavedConnection {
  id: string;
  name: string;
  url: string;
  lastUsed: number;
  isFavorite: boolean;
}

export interface ConnectionManagerProps {
  /** Callback when connection is established */
  onConnect?: (url: string) => void;

  /** Show as modal or inline */
  mode?: "modal" | "inline";

  /** Close modal callback */
  onClose?: () => void;
}

export function ConnectionManager(props: ConnectionManagerProps) {
  const adapter = usePlatformAdapter();
  const [serverUrl, setServerUrl] = createSignal("");
  const [serverName, setServerName] = createSignal("");
  const [isConnecting, setIsConnecting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [savedConnections, setSavedConnections] = createSignal<SavedConnection[]>([]);

  // Load saved connections from localStorage
  createEffect(() => {
    const stored = localStorage.getItem("openwork_saved_connections");
    if (stored) {
      try {
        setSavedConnections(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load saved connections:", e);
      }
    }
  });

  async function testConnection(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${url}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      return data.healthy === true || data.status === "ok";
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }

  async function handleConnect(url?: string) {
    const connectionUrl = url || serverUrl();

    if (!connectionUrl) {
      setError("Please enter a server URL");
      return;
    }

    // Validate URL format
    try {
      new URL(connectionUrl);
    } catch {
      setError("Invalid URL format");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Test connection
      const isHealthy = await testConnection(connectionUrl);

      if (!isHealthy) {
        throw new Error("Server health check failed");
      }

      // Save connection
      const connection: SavedConnection = {
        id: crypto.randomUUID(),
        name: serverName() || new URL(connectionUrl).hostname,
        url: connectionUrl,
        lastUsed: Date.now(),
        isFavorite: false,
      };

      // Update saved connections
      const existing = savedConnections();
      const updated = [
        connection,
        ...existing.filter((c) => c.url !== connectionUrl),
      ].slice(0, 10); // Keep only last 10

      setSavedConnections(updated);
      localStorage.setItem("openwork_saved_connections", JSON.stringify(updated));

      // Notify parent
      props.onConnect?.(connectionUrl);

      // Close modal if applicable
      if (props.mode === "modal") {
        props.onClose?.();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleSavedConnection(connection: SavedConnection) {
    // Update last used
    const updated = savedConnections().map((c) =>
      c.id === connection.id ? { ...c, lastUsed: Date.now() } : c,
    );
    setSavedConnections(updated);
    localStorage.setItem("openwork_saved_connections", JSON.stringify(updated));

    await handleConnect(connection.url);
  }

  function handleDelete(id: string) {
    const updated = savedConnections().filter((c) => c.id !== id);
    setSavedConnections(updated);
    localStorage.setItem("openwork_saved_connections", JSON.stringify(updated));
  }

  function toggleFavorite(id: string) {
    const updated = savedConnections().map((c) =>
      c.id === id ? { ...c, isFavorite: !c.isFavorite } : c,
    );
    setSavedConnections(updated);
    localStorage.setItem("openwork_saved_connections", JSON.stringify(updated));
  }

  const content = (
    <div class="space-y-6">
      {/* Header */}
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          Connect to OpenCode Server
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Enter the URL of your OpenCode server or select from saved connections.
        </p>
      </div>

      {/* Manual Connection */}
      <div class="space-y-4">
        <div>
          <label for="serverUrl" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Server URL
          </label>
          <input
            id="serverUrl"
            type="url"
            value={serverUrl()}
            onInput={(e) => setServerUrl(e.currentTarget.value)}
            placeholder="http://localhost:4096"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isConnecting()}
          />
        </div>

        <div>
          <label for="serverName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Connection Name (optional)
          </label>
          <input
            id="serverName"
            type="text"
            value={serverName()}
            onInput={(e) => setServerName(e.currentTarget.value)}
            placeholder="My Server"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isConnecting()}
          />
        </div>

        <Show when={error()}>
          <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p class="text-sm text-red-800 dark:text-red-200">{error()}</p>
          </div>
        </Show>

        <button
          onClick={() => handleConnect()}
          disabled={isConnecting() || !serverUrl()}
          class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Show when={isConnecting()} fallback={<>Connect</>}>
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Connecting...
          </Show>
        </button>
      </div>

      {/* Saved Connections */}
      <Show when={savedConnections().length > 0}>
        <div class="space-y-3">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Saved Connections
          </h3>
          <div class="space-y-2">
            <For each={savedConnections()}>
              {(connection) => (
                <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <button
                        onClick={() => toggleFavorite(connection.id)}
                        class="text-gray-400 hover:text-yellow-500 transition-colors"
                      >
                        <svg
                          class="w-4 h-4"
                          classList={{ "fill-yellow-500": connection.isFavorite }}
                          fill={connection.isFavorite ? "currentColor" : "none"}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {connection.name}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {connection.url}
                        </p>
                      </div>
                    </div>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Last used: {new Date(connection.lastUsed).toLocaleDateString()}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => handleSavedConnection(connection)}
                      class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      disabled={isConnecting()}
                    >
                      Connect
                    </button>
                    <button
                      onClick={() => handleDelete(connection.id)}
                      class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete connection"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );

  // Render as modal or inline
  return (
    <Show
      when={props.mode === "modal"}
      fallback={<div class="p-6 max-w-2xl mx-auto">{content}</div>}
    >
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div class="flex justify-end mb-4">
            <button
              onClick={() => props.onClose?.()}
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
          {content}
        </div>
      </div>
    </Show>
  );
}
