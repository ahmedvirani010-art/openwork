/**
 * Update Banner Component
 *
 * Displays a notification when a new version is available.
 * Allows users to install updates or dismiss the notification.
 */

import { Show } from "solid-js";
import { useUpdateManager } from "../lib/update-manager";

export function UpdateBanner() {
  const { state, installUpdate, dismissUpdate } = useUpdateManager();

  return (
    <Show when={state().status === "available"}>
      <div
        class="fixed top-0 left-0 right-0 z-50 p-4 shadow-lg"
        classList={{
          "bg-yellow-50 border-b border-yellow-200": !state().critical,
          "bg-red-50 border-b border-red-200": state().critical,
        }}
      >
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <svg
                class="w-5 h-5"
                classList={{
                  "text-yellow-600": !state().critical,
                  "text-red-600": state().critical,
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <span
                class="font-semibold"
                classList={{
                  "text-yellow-900": !state().critical,
                  "text-red-900": state().critical,
                }}
              >
                {state().critical ? "Critical Update Available" : "Update Available"}
              </span>

              <Show when={state().version}>
                <span
                  class="text-sm"
                  classList={{
                    "text-yellow-700": !state().critical,
                    "text-red-700": state().critical,
                  }}
                >
                  v{state().version}
                </span>
              </Show>
            </div>

            <Show when={state().releaseNotes}>
              <p
                class="mt-1 text-sm"
                classList={{
                  "text-yellow-800": !state().critical,
                  "text-red-800": state().critical,
                }}
              >
                {state().releaseNotes}
              </p>
            </Show>
          </div>

          <div class="flex items-center gap-2">
            <button
              onClick={installUpdate}
              class="px-4 py-2 rounded-md font-medium text-sm transition-colors"
              classList={{
                "bg-yellow-600 text-white hover:bg-yellow-700": !state().critical,
                "bg-red-600 text-white hover:bg-red-700": state().critical,
              }}
            >
              Update Now
            </button>

            <Show when={!state().critical}>
              <button
                onClick={dismissUpdate}
                class="px-4 py-2 rounded-md font-medium text-sm text-yellow-700 hover:bg-yellow-100 transition-colors"
              >
                Dismiss
              </button>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}

/**
 * Update Status Indicator
 *
 * Shows a small indicator in the UI when checking for updates
 */
export function UpdateStatusIndicator() {
  const { state, checkForUpdates } = useUpdateManager();

  return (
    <div class="flex items-center gap-2">
      <Show when={state().status === "checking"}>
        <div class="flex items-center gap-2 text-sm text-gray-600">
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
          <span>Checking for updates...</span>
        </div>
      </Show>

      <Show when={state().status === "idle" || state().status === "error"}>
        <button
          onClick={checkForUpdates}
          class="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          title="Check for updates"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </Show>

      <Show when={state().status === "error"}>
        <span class="text-xs text-red-600" title={state().message}>
          Update check failed
        </span>
      </Show>

      <Show when={state().lastCheckedAt}>
        <span class="text-xs text-gray-500">
          Last checked: {new Date(state().lastCheckedAt!).toLocaleTimeString()}
        </span>
      </Show>
    </div>
  );
}
