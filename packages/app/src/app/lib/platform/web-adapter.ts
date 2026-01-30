/**
 * Web Platform Adapter
 *
 * Implements platform operations for web browsers using modern Web APIs
 * and OpenWork Server for features that require server-side operations.
 */

import type { IPlatformAdapter, PlatformCapabilities } from "./types";
import type * as tauri from "../tauri";
import { hasFileSystemAccess } from "./detection";

/**
 * Web adapter configuration
 */
export interface WebAdapterConfig {
  /** OpenWork Server base URL */
  openworkServerUrl?: string;

  /** Authentication token for OpenWork Server */
  authToken?: string;
}

export class WebAdapter implements IPlatformAdapter {
  readonly name = "web" as const;

  readonly capabilities: PlatformCapabilities = {
    canManageEngine: false, // Requires server-side Docker API
    canAccessFileSystem: hasFileSystemAccess(),
    canRunOwpenbot: false, // Requires server-side bot service
    canAutoUpdate: true, // Service Worker updates
    canOpenExternalFiles: false, // Browser security restriction
    canWatchFiles: false, // No native file watching in browser
    canUseNativeDialogs: hasFileSystemAccess(),
    canInstallPackages: false, // Requires server-side operations
    canResetCache: true, // Can clear browser cache
  };

  private config: WebAdapterConfig;

  constructor(config: WebAdapterConfig = {}) {
    this.config = config;
  }

  /**
   * Get OpenWork Server URL from config or environment
   */
  private getServerUrl(): string {
    return (
      this.config.openworkServerUrl ||
      import.meta.env.VITE_OPENWORK_SERVER_URL ||
      "http://localhost:3001"
    );
  }

  /**
   * Get authentication headers for OpenWork Server
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const token = this.config.authToken || localStorage.getItem("openwork_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make a request to OpenWork Server
   */
  private async serverRequest<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.getServerUrl()}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Server request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a not-implemented error with helpful message
   */
  private notImplemented(feature: string): Error {
    return new Error(
      `${feature} is not available in web mode. ` +
        `This feature requires desktop capabilities or server-side implementation.`,
    );
  }

  // ===== Engine Management =====
  // Note: These require server-side Docker API integration

  async engineStart(projectDir: string, options?: { preferSidecar?: boolean }) {
    throw this.notImplemented("Engine management");
  }

  async engineStop() {
    throw this.notImplemented("Engine management");
  }

  async engineInfo(): Promise<tauri.EngineInfo> {
    throw this.notImplemented("Engine info");
  }

  async engineDoctor(options?: { preferSidecar?: boolean }) {
    throw this.notImplemented("Engine doctor");
  }

  async engineInstall() {
    throw this.notImplemented("Engine installation");
  }

  // ===== Workspace Management =====

  async workspaceBootstrap(): Promise<tauri.WorkspaceList> {
    // Load from localStorage (web-specific storage)
    const stored = localStorage.getItem("openwork_workspaces");
    if (stored) {
      return JSON.parse(stored);
    }

    // Default empty workspace list
    return {
      activeId: "",
      workspaces: [],
    };
  }

  async workspaceSetActive(workspaceId: string): Promise<tauri.WorkspaceList> {
    const workspaces = await this.workspaceBootstrap();
    workspaces.activeId = workspaceId;
    localStorage.setItem("openwork_workspaces", JSON.stringify(workspaces));
    return workspaces;
  }

  async workspaceCreate(input: {
    folderPath: string;
    name: string;
    preset: string;
  }): Promise<tauri.WorkspaceList> {
    // In web mode, we can't create local file system workspaces
    // This would need to use File System Access API or create a remote workspace
    throw this.notImplemented("Local workspace creation");
  }

  async workspaceCreateRemote(input: {
    baseUrl: string;
    directory?: string | null;
    displayName?: string | null;
    remoteType?: "openwork" | "opencode" | null;
    openworkHostUrl?: string | null;
    openworkWorkspaceId?: string | null;
    openworkWorkspaceName?: string | null;
  }): Promise<tauri.WorkspaceList> {
    const workspaces = await this.workspaceBootstrap();

    // Generate workspace ID
    const workspaceId = `remote-${Date.now()}`;

    // Create workspace info
    const workspace: tauri.WorkspaceInfo = {
      id: workspaceId,
      name: input.displayName || "Remote Workspace",
      path: "", // Remote workspaces don't have local paths
      preset: "remote",
      workspaceType: "remote",
      remoteType: input.remoteType,
      baseUrl: input.baseUrl,
      directory: input.directory,
      displayName: input.displayName,
      openworkHostUrl: input.openworkHostUrl,
      openworkWorkspaceId: input.openworkWorkspaceId,
      openworkWorkspaceName: input.openworkWorkspaceName,
    };

    workspaces.workspaces.push(workspace);
    workspaces.activeId = workspaceId;

    localStorage.setItem("openwork_workspaces", JSON.stringify(workspaces));
    return workspaces;
  }

  async workspaceUpdateRemote(input: {
    workspaceId: string;
    baseUrl?: string | null;
    directory?: string | null;
    displayName?: string | null;
    remoteType?: "openwork" | "opencode" | null;
    openworkHostUrl?: string | null;
    openworkWorkspaceId?: string | null;
    openworkWorkspaceName?: string | null;
  }): Promise<tauri.WorkspaceList> {
    const workspaces = await this.workspaceBootstrap();
    const workspace = workspaces.workspaces.find((w) => w.id === input.workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${input.workspaceId}`);
    }

    // Update workspace properties
    if (input.baseUrl !== undefined) workspace.baseUrl = input.baseUrl;
    if (input.directory !== undefined) workspace.directory = input.directory;
    if (input.displayName !== undefined) workspace.displayName = input.displayName;
    if (input.remoteType !== undefined) workspace.remoteType = input.remoteType;
    if (input.openworkHostUrl !== undefined) workspace.openworkHostUrl = input.openworkHostUrl;
    if (input.openworkWorkspaceId !== undefined)
      workspace.openworkWorkspaceId = input.openworkWorkspaceId;
    if (input.openworkWorkspaceName !== undefined)
      workspace.openworkWorkspaceName = input.openworkWorkspaceName;

    localStorage.setItem("openwork_workspaces", JSON.stringify(workspaces));
    return workspaces;
  }

  async workspaceForget(workspaceId: string): Promise<tauri.WorkspaceList> {
    const workspaces = await this.workspaceBootstrap();
    workspaces.workspaces = workspaces.workspaces.filter((w) => w.id !== workspaceId);

    if (workspaces.activeId === workspaceId) {
      workspaces.activeId = workspaces.workspaces[0]?.id || "";
    }

    localStorage.setItem("openwork_workspaces", JSON.stringify(workspaces));
    return workspaces;
  }

  async workspaceAddAuthorizedRoot(input: {
    workspacePath: string;
    folderPath: string;
  }): Promise<tauri.ExecResult> {
    throw this.notImplemented("Adding authorized roots");
  }

  async workspaceExportConfig(input: {
    workspaceId: string;
    outputPath: string;
  }): Promise<tauri.WorkspaceExportSummary> {
    throw this.notImplemented("Workspace export");
  }

  async workspaceImportConfig(input: {
    archivePath: string;
    targetDir: string;
    name?: string | null;
  }): Promise<tauri.WorkspaceList> {
    throw this.notImplemented("Workspace import");
  }

  async workspaceOpenworkRead(input: {
    workspacePath: string;
  }): Promise<tauri.WorkspaceOpenworkConfig> {
    throw this.notImplemented("Reading workspace config");
  }

  async workspaceOpenworkWrite(input: {
    workspacePath: string;
    config: tauri.WorkspaceOpenworkConfig;
  }): Promise<tauri.ExecResult> {
    throw this.notImplemented("Writing workspace config");
  }

  // ===== File System Operations =====

  async pickDirectory(options?: {
    title?: string;
    defaultPath?: string;
    multiple?: boolean;
  }): Promise<string | string[] | null> {
    if (!hasFileSystemAccess()) {
      throw new Error(
        "File System Access API is not available in this browser. " +
          "Please use Chrome 86+, Edge 86+, or Safari 15.2+",
      );
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        id: "workspace-picker",
        mode: "readwrite",
        startIn: "documents",
      });

      // Store handle for later use
      // Note: In production, we'd store this in IndexedDB
      return handle.name;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return null; // User cancelled
      }
      throw err;
    }
  }

  async pickFile(options?: {
    title?: string;
    defaultPath?: string;
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string | string[] | null> {
    if (!hasFileSystemAccess()) {
      throw new Error("File System Access API is not available in this browser");
    }

    try {
      const handles = await (window as any).showOpenFilePicker({
        multiple: options?.multiple ?? false,
        types: options?.filters?.map((filter) => ({
          description: filter.name,
          accept: {
            "*/*": filter.extensions.map((ext) => `.${ext}`),
          },
        })),
      });

      if (options?.multiple) {
        return handles.map((h: any) => h.name);
      }
      return handles[0]?.name ?? null;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return null;
      }
      throw err;
    }
  }

  async saveFile(options?: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string | null> {
    if (!hasFileSystemAccess()) {
      throw new Error("File System Access API is not available in this browser");
    }

    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: options?.defaultPath?.split("/").pop(),
        types: options?.filters?.map((filter) => ({
          description: filter.name,
          accept: {
            "*/*": filter.extensions.map((ext) => `.${ext}`),
          },
        })),
      });

      return handle.name;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return null;
      }
      throw err;
    }
  }

  // ===== OpenCode Configuration =====

  async readOpencodeConfig(
    scope: "project" | "global",
    projectDir: string,
  ): Promise<tauri.OpencodeConfigFile> {
    throw this.notImplemented("Reading OpenCode config");
  }

  async writeOpencodeConfig(
    scope: "project" | "global",
    projectDir: string,
    content: string,
  ): Promise<tauri.ExecResult> {
    throw this.notImplemented("Writing OpenCode config");
  }

  async opencodeCommandList(input: {
    scope: "workspace" | "global";
    projectDir: string;
  }): Promise<string[]> {
    throw this.notImplemented("Listing commands");
  }

  async opencodeCommandWrite(input: {
    scope: "workspace" | "global";
    projectDir: string;
    command: tauri.OpencodeCommandDraft;
  }): Promise<tauri.ExecResult> {
    throw this.notImplemented("Writing commands");
  }

  async opencodeCommandDelete(input: {
    scope: "workspace" | "global";
    projectDir: string;
    name: string;
  }): Promise<tauri.ExecResult> {
    throw this.notImplemented("Deleting commands");
  }

  async opencodeMcpAuth(projectDir: string, serverName: string): Promise<tauri.ExecResult> {
    throw this.notImplemented("MCP authentication");
  }

  // ===== Package Management =====

  async opkgInstall(projectDir: string, pkg: string): Promise<tauri.ExecResult> {
    throw this.notImplemented("Package installation");
  }

  async importSkill(
    projectDir: string,
    sourceDir: string,
    options?: { overwrite?: boolean },
  ): Promise<tauri.ExecResult> {
    throw this.notImplemented("Skill import");
  }

  async installSkillTemplate(
    projectDir: string,
    name: string,
    content: string,
    options?: { overwrite?: boolean },
  ): Promise<tauri.ExecResult> {
    throw this.notImplemented("Skill template installation");
  }

  async listLocalSkills(projectDir: string): Promise<tauri.LocalSkillCard[]> {
    throw this.notImplemented("Listing skills");
  }

  async uninstallSkill(projectDir: string, name: string): Promise<tauri.ExecResult> {
    throw this.notImplemented("Skill uninstallation");
  }

  // ===== OpenWork Server =====

  async openworkServerInfo(): Promise<tauri.OpenworkServerInfo> {
    throw this.notImplemented("OpenWork Server info");
  }

  // ===== Application Management =====

  async updaterEnvironment(): Promise<tauri.UpdaterEnvironment> {
    // In web mode, updates are handled by Service Worker
    return {
      supported: true,
      reason: "Updates managed by Service Worker",
      executablePath: null,
      appBundlePath: null,
    };
  }

  async resetOpenworkState(mode: "onboarding" | "all"): Promise<void> {
    // Clear localStorage
    if (mode === "all") {
      localStorage.clear();
    } else {
      // Clear only onboarding-related keys
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("openwork_onboarding")) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  async resetOpencodeCache(): Promise<tauri.CacheResetResult> {
    // Clear browser cache
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      return {
        removed: cacheNames,
        missing: [],
        errors: [],
      };
    }

    return {
      removed: [],
      missing: [],
      errors: ["Cache API not available"],
    };
  }

  // ===== Owpenbot =====
  // Note: These require server-side bot service

  async getOwpenbotStatus(): Promise<tauri.OwpenbotStatus | null> {
    throw this.notImplemented("Owpenbot");
  }

  async owpenbotInfo(): Promise<tauri.OwpenbotInfo> {
    throw this.notImplemented("Owpenbot");
  }

  async getOwpenbotQr(): Promise<tauri.OwpenbotQr | null> {
    throw this.notImplemented("Owpenbot");
  }

  async setOwpenbotDmPolicy(
    policy: tauri.OwpenbotWhatsAppStatus["dmPolicy"],
  ): Promise<tauri.ExecResult> {
    throw this.notImplemented("Owpenbot");
  }

  async setOwpenbotAllowlist(allowlist: string[]): Promise<tauri.ExecResult> {
    throw this.notImplemented("Owpenbot");
  }

  async setOwpenbotTelegramToken(token: string): Promise<tauri.ExecResult> {
    throw this.notImplemented("Owpenbot");
  }

  async getOwpenbotPairingRequests(): Promise<tauri.OwpenbotPairingRequest[]> {
    throw this.notImplemented("Owpenbot");
  }

  async approveOwpenbotPairing(code: string): Promise<tauri.ExecResult> {
    throw this.notImplemented("Owpenbot");
  }

  async denyOwpenbotPairing(code: string): Promise<tauri.ExecResult> {
    throw this.notImplemented("Owpenbot");
  }
}
