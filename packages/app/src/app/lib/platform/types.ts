/**
 * Platform Abstraction Layer
 *
 * This module provides a unified interface for platform-specific operations,
 * allowing the app to run on both desktop (Tauri) and web (browser) environments.
 */

import type {
  EngineInfo,
  OpenworkServerInfo,
  EngineDoctorResult,
  WorkspaceInfo,
  WorkspaceList,
  WorkspaceExportSummary,
  WorkspaceOpenworkConfig,
  OpencodeCommandDraft,
  ExecResult,
  LocalSkillCard,
  OpencodeConfigFile,
  UpdaterEnvironment,
  CacheResetResult,
  OwpenbotStatus,
  OwpenbotInfo,
  OwpenbotQr,
  OwpenbotPairingRequest,
  OwpenbotWhatsAppStatus,
} from "../tauri";

/**
 * Platform capabilities indicate which features are available in the current runtime
 */
export interface PlatformCapabilities {
  /** Can manage OpenCode engine lifecycle (start/stop) */
  canManageEngine: boolean;

  /** Can access local file system with native dialogs */
  canAccessFileSystem: boolean;

  /** Can run Owpenbot (WhatsApp/Telegram bot) */
  canRunOwpenbot: boolean;

  /** Can auto-update the application */
  canAutoUpdate: boolean;

  /** Can open files in external applications */
  canOpenExternalFiles: boolean;

  /** Can watch file system for changes */
  canWatchFiles: boolean;

  /** Can use native dialogs (file picker, save dialog) */
  canUseNativeDialogs: boolean;

  /** Can install packages via opkg */
  canInstallPackages: boolean;

  /** Can reset application cache */
  canResetCache: boolean;
}

/**
 * File picker options for directory selection
 */
export interface DirectoryPickerOptions {
  title?: string;
  defaultPath?: string;
  multiple?: boolean;
}

/**
 * File picker options for file selection
 */
export interface FilePickerOptions {
  title?: string;
  defaultPath?: string;
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}

/**
 * Save dialog options
 */
export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

/**
 * Platform Adapter Interface
 *
 * Defines all platform-specific operations that must be implemented
 * by both desktop (Tauri) and web adapters.
 */
export interface IPlatformAdapter {
  /** Platform capabilities */
  readonly capabilities: PlatformCapabilities;

  /** Platform name for debugging */
  readonly name: "desktop" | "web";

  // ===== Engine Management =====

  /** Start the OpenCode engine */
  engineStart(projectDir: string, options?: { preferSidecar?: boolean }): Promise<EngineInfo>;

  /** Stop the OpenCode engine */
  engineStop(): Promise<EngineInfo>;

  /** Get current engine information */
  engineInfo(): Promise<EngineInfo>;

  /** Check engine installation and configuration */
  engineDoctor(options?: { preferSidecar?: boolean }): Promise<EngineDoctorResult>;

  /** Install OpenCode engine */
  engineInstall(): Promise<ExecResult>;

  // ===== Workspace Management =====

  /** Bootstrap workspace list from saved state */
  workspaceBootstrap(): Promise<WorkspaceList>;

  /** Set active workspace */
  workspaceSetActive(workspaceId: string): Promise<WorkspaceList>;

  /** Create a new local workspace */
  workspaceCreate(input: {
    folderPath: string;
    name: string;
    preset: string;
  }): Promise<WorkspaceList>;

  /** Create a new remote workspace connection */
  workspaceCreateRemote(input: {
    baseUrl: string;
    directory?: string | null;
    displayName?: string | null;
    remoteType?: "openwork" | "opencode" | null;
    openworkHostUrl?: string | null;
    openworkWorkspaceId?: string | null;
    openworkWorkspaceName?: string | null;
  }): Promise<WorkspaceList>;

  /** Update remote workspace configuration */
  workspaceUpdateRemote(input: {
    workspaceId: string;
    baseUrl?: string | null;
    directory?: string | null;
    displayName?: string | null;
    remoteType?: "openwork" | "opencode" | null;
    openworkHostUrl?: string | null;
    openworkWorkspaceId?: string | null;
    openworkWorkspaceName?: string | null;
  }): Promise<WorkspaceList>;

  /** Remove workspace from list */
  workspaceForget(workspaceId: string): Promise<WorkspaceList>;

  /** Add authorized root directory to workspace */
  workspaceAddAuthorizedRoot(input: {
    workspacePath: string;
    folderPath: string;
  }): Promise<ExecResult>;

  /** Export workspace configuration */
  workspaceExportConfig(input: {
    workspaceId: string;
    outputPath: string;
  }): Promise<WorkspaceExportSummary>;

  /** Import workspace configuration */
  workspaceImportConfig(input: {
    archivePath: string;
    targetDir: string;
    name?: string | null;
  }): Promise<WorkspaceList>;

  /** Read workspace OpenWork configuration */
  workspaceOpenworkRead(input: { workspacePath: string }): Promise<WorkspaceOpenworkConfig>;

  /** Write workspace OpenWork configuration */
  workspaceOpenworkWrite(input: {
    workspacePath: string;
    config: WorkspaceOpenworkConfig;
  }): Promise<ExecResult>;

  // ===== File System Operations =====

  /** Pick a directory (native dialog) */
  pickDirectory(options?: DirectoryPickerOptions): Promise<string | string[] | null>;

  /** Pick a file (native dialog) */
  pickFile(options?: FilePickerOptions): Promise<string | string[] | null>;

  /** Save file dialog */
  saveFile(options?: SaveDialogOptions): Promise<string | null>;

  // ===== OpenCode Configuration =====

  /** Read OpenCode configuration file */
  readOpencodeConfig(scope: "project" | "global", projectDir: string): Promise<OpencodeConfigFile>;

  /** Write OpenCode configuration file */
  writeOpencodeConfig(
    scope: "project" | "global",
    projectDir: string,
    content: string,
  ): Promise<ExecResult>;

  /** List custom commands */
  opencodeCommandList(input: { scope: "workspace" | "global"; projectDir: string }): Promise<string[]>;

  /** Write custom command */
  opencodeCommandWrite(input: {
    scope: "workspace" | "global";
    projectDir: string;
    command: OpencodeCommandDraft;
  }): Promise<ExecResult>;

  /** Delete custom command */
  opencodeCommandDelete(input: {
    scope: "workspace" | "global";
    projectDir: string;
    name: string;
  }): Promise<ExecResult>;

  /** Trigger MCP server authentication */
  opencodeMcpAuth(projectDir: string, serverName: string): Promise<ExecResult>;

  // ===== Package Management =====

  /** Install package via opkg */
  opkgInstall(projectDir: string, pkg: string): Promise<ExecResult>;

  /** Import skill from directory */
  importSkill(
    projectDir: string,
    sourceDir: string,
    options?: { overwrite?: boolean },
  ): Promise<ExecResult>;

  /** Install skill from template */
  installSkillTemplate(
    projectDir: string,
    name: string,
    content: string,
    options?: { overwrite?: boolean },
  ): Promise<ExecResult>;

  /** List locally installed skills */
  listLocalSkills(projectDir: string): Promise<LocalSkillCard[]>;

  /** Uninstall a skill */
  uninstallSkill(projectDir: string, name: string): Promise<ExecResult>;

  // ===== OpenWork Server =====

  /** Get OpenWork server information */
  openworkServerInfo(): Promise<OpenworkServerInfo>;

  // ===== Application Management =====

  /** Get updater environment information */
  updaterEnvironment(): Promise<UpdaterEnvironment>;

  /** Reset OpenWork application state */
  resetOpenworkState(mode: "onboarding" | "all"): Promise<void>;

  /** Reset OpenCode cache */
  resetOpencodeCache(): Promise<CacheResetResult>;

  // ===== Owpenbot (Bot Management) =====

  /** Get Owpenbot status */
  getOwpenbotStatus(): Promise<OwpenbotStatus | null>;

  /** Get Owpenbot information */
  owpenbotInfo(): Promise<OwpenbotInfo>;

  /** Get WhatsApp QR code for pairing */
  getOwpenbotQr(): Promise<OwpenbotQr | null>;

  /** Set WhatsApp DM policy */
  setOwpenbotDmPolicy(policy: OwpenbotWhatsAppStatus["dmPolicy"]): Promise<ExecResult>;

  /** Set WhatsApp allowlist */
  setOwpenbotAllowlist(allowlist: string[]): Promise<ExecResult>;

  /** Set Telegram bot token */
  setOwpenbotTelegramToken(token: string): Promise<ExecResult>;

  /** Get pending pairing requests */
  getOwpenbotPairingRequests(): Promise<OwpenbotPairingRequest[]>;

  /** Approve pairing request */
  approveOwpenbotPairing(code: string): Promise<ExecResult>;

  /** Deny pairing request */
  denyOwpenbotPairing(code: string): Promise<ExecResult>;
}
