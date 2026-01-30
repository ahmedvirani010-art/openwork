/**
 * Workspace Selector Component
 *
 * Allows users to create, select, and manage workspaces in web mode.
 * For desktop mode, this can defer to the existing workspace management.
 */

import { createSignal, For, Show, createEffect } from "solid-js";
import { usePlatformAdapter } from "../lib/platform";
import type { Workspace, WorkspaceList } from "../lib/platform/types";

export interface WorkspaceSelectorProps {
  /** Callback when workspace is selected */
  onSelect?: (workspace: Workspace) => void;

  /** Show as modal or inline */
  mode?: "modal" | "inline";

  /** Close modal callback */
  onClose?: () => void;

  /** Current active workspace ID */
  activeWorkspaceId?: string;
}

export function WorkspaceSelector(props: WorkspaceSelectorProps) {
  const adapter = usePlatformAdapter();
  const [workspaces, setWorkspaces] = createSignal<Workspace[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [showCreateForm, setShowCreateForm] = createSignal(false);

  // Create workspace form state
  const [newWorkspaceName, setNewWorkspaceName] = createSignal("");
  const [newWorkspacePreset, setNewWorkspacePreset] = createSignal("default");
  const [isCreating, setIsCreating] = createSignal(false);

  // Load workspaces on mount
  createEffect(async () => {
    try {
      setIsLoading(true);
      const workspaceList = await adapter.workspaceBootstrap();
      setWorkspaces(workspaceList.workspaces);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
    } finally {
      setIsLoading(false);
    }
  });

  async function handleSelectWorkspace(workspace: Workspace) {
    try {
      // Update active workspace
      await adapter.workspaceSetActive(workspace.id);

      // Notify parent
      props.onSelect?.(workspace);

      // Close modal if applicable
      if (props.mode === "modal") {
        props.onClose?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select workspace");
    }
  }

  async function handleCreateWorkspace() {
    const name = newWorkspaceName().trim();

    if (!name) {
      setError("Please enter a workspace name");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // For web mode, we need to prompt for a directory or create virtual workspace
      let folderPath: string | null = null;

      if (adapter.capabilities.canAccessFileSystem) {
        // Use File System Access API to pick directory
        try {
          const picked = await adapter.pickDirectory({
            title: `Select folder for workspace: ${name}`,
          });
          folderPath = Array.isArray(picked) ? picked[0] : picked;
        } catch {
          // User cancelled picker
          setIsCreating(false);
          return;
        }
      } else {
        // Create virtual workspace (remote only)
        folderPath = `/workspaces/${name}`;
      }

      if (!folderPath) {
        setError("No folder selected");
        setIsCreating(false);
        return;
      }

      // Create workspace
      const result = await adapter.workspaceCreate({
        folderPath,
        name,
        preset: newWorkspacePreset(),
      });

      // Update workspace list
      setWorkspaces(result.workspaces);

      // Reset form
      setNewWorkspaceName("");
      setNewWorkspacePreset("default");
      setShowCreateForm(false);

      // Select the newly created workspace
      const newWorkspace = result.workspaces.find((w) => w.name === name);
      if (newWorkspace) {
        await handleSelectWorkspace(newWorkspace);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteWorkspace(workspaceId: string) {
    if (!confirm("Are you sure you want to delete this workspace?")) {
      return;
    }

    try {
      await adapter.workspaceDelete(workspaceId);

      // Refresh workspace list
      const workspaceList = await adapter.workspaceBootstrap();
      setWorkspaces(workspaceList.workspaces);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workspace");
    }
  }

  const content = (
    <div class="space-y-6">
      {/* Header */}
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          Workspaces
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create and manage your workspaces
        </p>
      </div>

      {/* Error Display */}
      <Show when={error()}>
        <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p class="text-sm text-red-800 dark:text-red-200">{error()}</p>
        </div>
      </Show>

      {/* Loading State */}
      <Show when={isLoading()}>
        <div class="flex items-center justify-center py-8">
          <svg class="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
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
        </div>
      </Show>

      {/* Workspace List */}
      <Show when={!isLoading() && workspaces().length > 0}>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Your Workspaces
            </h3>
            <button
              onClick={() => setShowCreateForm(true)}
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              + New Workspace
            </button>
          </div>

          <div class="space-y-2">
            <For each={workspaces()}>
              {(workspace) => (
                <div
                  class="flex items-center justify-between p-4 border rounded-md transition-colors"
                  classList={{
                    "border-blue-500 bg-blue-50 dark:bg-blue-900/20":
                      workspace.id === props.activeWorkspaceId,
                    "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800":
                      workspace.id !== props.activeWorkspaceId,
                  }}
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <Show when={workspace.id === props.activeWorkspaceId}>
                        <div class="w-2 h-2 bg-blue-600 rounded-full" />
                      </Show>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {workspace.name}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {workspace.folderPath}
                        </p>
                      </div>
                    </div>
                    <Show when={workspace.preset}>
                      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Preset: {workspace.preset}
                      </p>
                    </Show>
                  </div>

                  <div class="flex items-center gap-2 ml-3">
                    <Show when={workspace.id !== props.activeWorkspaceId}>
                      <button
                        onClick={() => handleSelectWorkspace(workspace)}
                        class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Open
                      </button>
                    </Show>
                    <Show when={workspace.id === props.activeWorkspaceId}>
                      <span class="px-3 py-1 text-sm bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200 rounded">
                        Active
                      </span>
                    </Show>
                    <button
                      onClick={() => handleDeleteWorkspace(workspace.id)}
                      class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete workspace"
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

      {/* Empty State */}
      <Show when={!isLoading() && workspaces().length === 0}>
        <div class="text-center py-12">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No workspaces
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new workspace
          </p>
          <div class="mt-6">
            <button
              onClick={() => setShowCreateForm(true)}
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Workspace
            </button>
          </div>
        </div>
      </Show>

      {/* Create Workspace Form */}
      <Show when={showCreateForm()}>
        <div class="border border-gray-200 dark:border-gray-700 rounded-md p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              Create New Workspace
            </h3>
            <button
              onClick={() => setShowCreateForm(false)}
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div>
            <label
              for="workspaceName"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Workspace Name
            </label>
            <input
              id="workspaceName"
              type="text"
              value={newWorkspaceName()}
              onInput={(e) => setNewWorkspaceName(e.currentTarget.value)}
              placeholder="My Project"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating()}
            />
          </div>

          <div>
            <label
              for="workspacePreset"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Preset
            </label>
            <select
              id="workspacePreset"
              value={newWorkspacePreset()}
              onChange={(e) => setNewWorkspacePreset(e.currentTarget.value)}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating()}
            >
              <option value="default">Default</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript/Node.js</option>
              <option value="typescript">TypeScript</option>
              <option value="react">React</option>
              <option value="vue">Vue</option>
              <option value="rust">Rust</option>
              <option value="go">Go</option>
            </select>
          </div>

          <Show when={!adapter.capabilities.canAccessFileSystem}>
            <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p class="text-sm text-yellow-800 dark:text-yellow-200">
                Note: Your browser doesn't support local file access. A remote workspace will be created.
              </p>
            </div>
          </Show>

          <div class="flex gap-2">
            <button
              onClick={handleCreateWorkspace}
              disabled={isCreating() || !newWorkspaceName()}
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Show when={isCreating()} fallback={<>Create Workspace</>}>
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
                Creating...
              </Show>
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              disabled={isCreating()}
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Show>
    </div>
  );

  // Render as modal or inline
  return (
    <Show
      when={props.mode === "modal"}
      fallback={<div class="p-6 max-w-4xl mx-auto">{content}</div>}
    >
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
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
