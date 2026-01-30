/**
 * Tauri Platform Adapter
 *
 * Wraps existing Tauri commands to implement the IPlatformAdapter interface.
 * This adapter is used when running in the desktop (Tauri) environment.
 */

import type { IPlatformAdapter, PlatformCapabilities } from "./types";
import * as tauri from "../tauri";

export class TauriAdapter implements IPlatformAdapter {
  readonly name = "desktop" as const;

  readonly capabilities: PlatformCapabilities = {
    canManageEngine: true,
    canAccessFileSystem: true,
    canRunOwpenbot: true,
    canAutoUpdate: true,
    canOpenExternalFiles: true,
    canWatchFiles: true,
    canUseNativeDialogs: true,
    canInstallPackages: true,
    canResetCache: true,
  };

  // ===== Engine Management =====

  async engineStart(projectDir: string, options?: { preferSidecar?: boolean }) {
    return tauri.engineStart(projectDir, options);
  }

  async engineStop() {
    return tauri.engineStop();
  }

  async engineInfo() {
    return tauri.engineInfo();
  }

  async engineDoctor(options?: { preferSidecar?: boolean }) {
    return tauri.engineDoctor(options);
  }

  async engineInstall() {
    return tauri.engineInstall();
  }

  // ===== Workspace Management =====

  async workspaceBootstrap() {
    return tauri.workspaceBootstrap();
  }

  async workspaceSetActive(workspaceId: string) {
    return tauri.workspaceSetActive(workspaceId);
  }

  async workspaceCreate(input: { folderPath: string; name: string; preset: string }) {
    return tauri.workspaceCreate(input);
  }

  async workspaceCreateRemote(input: {
    baseUrl: string;
    directory?: string | null;
    displayName?: string | null;
    remoteType?: "openwork" | "opencode" | null;
    openworkHostUrl?: string | null;
    openworkWorkspaceId?: string | null;
    openworkWorkspaceName?: string | null;
  }) {
    return tauri.workspaceCreateRemote(input);
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
  }) {
    return tauri.workspaceUpdateRemote(input);
  }

  async workspaceForget(workspaceId: string) {
    return tauri.workspaceForget(workspaceId);
  }

  async workspaceAddAuthorizedRoot(input: { workspacePath: string; folderPath: string }) {
    return tauri.workspaceAddAuthorizedRoot(input);
  }

  async workspaceExportConfig(input: { workspaceId: string; outputPath: string }) {
    return tauri.workspaceExportConfig(input);
  }

  async workspaceImportConfig(input: {
    archivePath: string;
    targetDir: string;
    name?: string | null;
  }) {
    return tauri.workspaceImportConfig(input);
  }

  async workspaceOpenworkRead(input: { workspacePath: string }) {
    return tauri.workspaceOpenworkRead(input);
  }

  async workspaceOpenworkWrite(input: {
    workspacePath: string;
    config: tauri.WorkspaceOpenworkConfig;
  }) {
    return tauri.workspaceOpenworkWrite(input);
  }

  // ===== File System Operations =====

  async pickDirectory(options?: {
    title?: string;
    defaultPath?: string;
    multiple?: boolean;
  }) {
    return tauri.pickDirectory(options);
  }

  async pickFile(options?: {
    title?: string;
    defaultPath?: string;
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) {
    return tauri.pickFile(options);
  }

  async saveFile(options?: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) {
    return tauri.saveFile(options);
  }

  // ===== OpenCode Configuration =====

  async readOpencodeConfig(scope: "project" | "global", projectDir: string) {
    return tauri.readOpencodeConfig(scope, projectDir);
  }

  async writeOpencodeConfig(scope: "project" | "global", projectDir: string, content: string) {
    return tauri.writeOpencodeConfig(scope, projectDir, content);
  }

  async opencodeCommandList(input: { scope: "workspace" | "global"; projectDir: string }) {
    return tauri.opencodeCommandList(input);
  }

  async opencodeCommandWrite(input: {
    scope: "workspace" | "global";
    projectDir: string;
    command: tauri.OpencodeCommandDraft;
  }) {
    return tauri.opencodeCommandWrite(input);
  }

  async opencodeCommandDelete(input: {
    scope: "workspace" | "global";
    projectDir: string;
    name: string;
  }) {
    return tauri.opencodeCommandDelete(input);
  }

  async opencodeMcpAuth(projectDir: string, serverName: string) {
    return tauri.opencodeMcpAuth(projectDir, serverName);
  }

  // ===== Package Management =====

  async opkgInstall(projectDir: string, pkg: string) {
    return tauri.opkgInstall(projectDir, pkg);
  }

  async importSkill(projectDir: string, sourceDir: string, options?: { overwrite?: boolean }) {
    return tauri.importSkill(projectDir, sourceDir, options);
  }

  async installSkillTemplate(
    projectDir: string,
    name: string,
    content: string,
    options?: { overwrite?: boolean },
  ) {
    return tauri.installSkillTemplate(projectDir, name, content, options);
  }

  async listLocalSkills(projectDir: string) {
    return tauri.listLocalSkills(projectDir);
  }

  async uninstallSkill(projectDir: string, name: string) {
    return tauri.uninstallSkill(projectDir, name);
  }

  // ===== OpenWork Server =====

  async openworkServerInfo() {
    return tauri.openworkServerInfo();
  }

  // ===== Application Management =====

  async updaterEnvironment() {
    return tauri.updaterEnvironment();
  }

  async resetOpenworkState(mode: "onboarding" | "all") {
    return tauri.resetOpenworkState(mode);
  }

  async resetOpencodeCache() {
    return tauri.resetOpencodeCache();
  }

  // ===== Owpenbot =====

  async getOwpenbotStatus() {
    return tauri.getOwpenbotStatus();
  }

  async owpenbotInfo() {
    return tauri.owpenbotInfo();
  }

  async getOwpenbotQr() {
    return tauri.getOwpenbotQr();
  }

  async setOwpenbotDmPolicy(policy: tauri.OwpenbotWhatsAppStatus["dmPolicy"]) {
    return tauri.setOwpenbotDmPolicy(policy);
  }

  async setOwpenbotAllowlist(allowlist: string[]) {
    return tauri.setOwpenbotAllowlist(allowlist);
  }

  async setOwpenbotTelegramToken(token: string) {
    return tauri.setOwpenbotTelegramToken(token);
  }

  async getOwpenbotPairingRequests() {
    return tauri.getOwpenbotPairingRequests();
  }

  async approveOwpenbotPairing(code: string) {
    return tauri.approveOwpenbotPairing(code);
  }

  async denyOwpenbotPairing(code: string) {
    return tauri.denyOwpenbotPairing(code);
  }
}
