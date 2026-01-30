/**
 * Update Manager
 *
 * Handles application updates in web mode using Service Worker.
 * Provides version checking, update installation, and user notifications.
 */

import { createSignal, createEffect, onCleanup } from "solid-js";
import { getPlatformMode } from "./platform";

/**
 * Version information from server
 */
export interface VersionInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl?: string;
  critical: boolean;
}

/**
 * Update state
 */
export type UpdateState =
  | { status: "idle"; lastCheckedAt: number | null }
  | { status: "checking"; startedAt: number }
  | { status: "available"; version: string; releaseNotes: string; critical: boolean }
  | { status: "downloading"; progress: number }
  | { status: "ready"; version: string }
  | { status: "error"; message: string };

/**
 * Update Manager Class
 */
export class UpdateManager {
  private registration: ServiceWorkerRegistration | null = null;
  private currentVersion: string;
  private checkInterval: number = 30 * 60 * 1000; // 30 minutes
  private intervalId: NodeJS.Timeout | null = null;

  constructor(currentVersion: string = "1.0.0") {
    this.currentVersion = currentVersion;
  }

  /**
   * Initialize update manager and register service worker
   */
  async initialize(): Promise<void> {
    // Only run in web mode
    if (getPlatformMode() !== "web") {
      console.log("[UpdateManager] Skipping initialization (not in web mode)");
      return;
    }

    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      console.warn("[UpdateManager] Service Workers not supported");
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register("/service-worker.js", {
        scope: "/",
      });

      console.log("[UpdateManager] Service Worker registered");

      // Listen for updates
      this.registration.addEventListener("updatefound", () => {
        this.handleUpdateFound();
      });

      // Check if there's an update waiting
      if (this.registration.waiting) {
        this.handleUpdateWaiting(this.registration.waiting);
      }

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[UpdateManager] New version activated, reloading...");
        window.location.reload();
      });

      // Start periodic update checks
      this.startPeriodicChecks();
    } catch (error) {
      console.error("[UpdateManager] Service Worker registration failed:", error);
    }
  }

  /**
   * Start periodic update checks
   */
  private startPeriodicChecks(): void {
    // Check immediately
    this.checkForUpdates();

    // Check periodically
    this.intervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
  }

  /**
   * Stop periodic update checks
   */
  stopPeriodicChecks(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for updates from server
   */
  async checkForUpdates(): Promise<VersionInfo | null> {
    try {
      const versionUrl = import.meta.env.VITE_VERSION_API_URL || "/api/version";
      const response = await fetch(versionUrl);

      if (!response.ok) {
        throw new Error(`Version check failed: ${response.statusText}`);
      }

      const versionInfo: VersionInfo = await response.json();

      // Compare versions
      if (this.isNewerVersion(versionInfo.version, this.currentVersion)) {
        console.log(`[UpdateManager] New version available: ${versionInfo.version}`);
        return versionInfo;
      }

      console.log("[UpdateManager] Already on latest version");
      return null;
    } catch (error) {
      console.error("[UpdateManager] Update check failed:", error);
      return null;
    }
  }

  /**
   * Compare version strings
   */
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const parseVersion = (v: string) =>
      v
        .replace(/^v/, "")
        .split(".")
        .map((n) => parseInt(n, 10));

    const newParts = parseVersion(newVersion);
    const currentParts = parseVersion(currentVersion);

    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }

    return false;
  }

  /**
   * Handle service worker update found
   */
  private handleUpdateFound(): void {
    if (!this.registration) return;

    const newWorker = this.registration.installing;
    if (!newWorker) return;

    console.log("[UpdateManager] Update found, downloading...");

    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
        this.handleUpdateWaiting(newWorker);
      }
    });
  }

  /**
   * Handle service worker waiting to activate
   */
  private handleUpdateWaiting(worker: ServiceWorker): void {
    console.log("[UpdateManager] Update ready to install");

    // Emit event for UI to show update prompt
    window.dispatchEvent(
      new CustomEvent("sw-update-available", {
        detail: { worker },
      }),
    );
  }

  /**
   * Install pending update
   */
  async installUpdate(): Promise<void> {
    if (!this.registration) {
      throw new Error("No service worker registration found");
    }

    const waiting = this.registration.waiting;
    if (!waiting) {
      // Try to update the registration
      await this.registration.update();
      return;
    }

    // Tell the waiting service worker to skip waiting
    waiting.postMessage({ type: "SKIP_WAITING" });

    // The page will reload when the new SW takes control
  }

  /**
   * Get current service worker version
   */
  async getCurrentVersion(): Promise<string> {
    if (!this.registration || !this.registration.active) {
      return this.currentVersion;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version || this.currentVersion);
      };

      this.registration!.active!.postMessage({ type: "GET_VERSION" }, [messageChannel.port2]);

      // Timeout fallback
      setTimeout(() => resolve(this.currentVersion), 1000);
    });
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    if (!this.registration || !this.registration.active) {
      throw new Error("No active service worker");
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve();
        } else {
          reject(new Error("Cache clear failed"));
        }
      };

      this.registration!.active!.postMessage({ type: "CLEAR_CACHE" }, [messageChannel.port2]);

      // Timeout
      setTimeout(() => reject(new Error("Cache clear timeout")), 5000);
    });
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<void> {
    if (!this.registration) return;

    await this.registration.unregister();
    this.registration = null;
    this.stopPeriodicChecks();
    console.log("[UpdateManager] Service Worker unregistered");
  }
}

/**
 * Hook for using update manager in Solid components
 */
export function useUpdateManager() {
  const [state, setState] = createSignal<UpdateState>({ status: "idle", lastCheckedAt: null });
  const [manager] = createSignal(new UpdateManager());

  // Initialize on mount
  createEffect(() => {
    manager().initialize();

    // Listen for update available events
    const handleUpdateAvailable = (event: Event) => {
      const customEvent = event as CustomEvent;
      setState({
        status: "available",
        version: "Unknown",
        releaseNotes: "A new version is available",
        critical: false,
      });
    };

    window.addEventListener("sw-update-available", handleUpdateAvailable);

    onCleanup(() => {
      window.removeEventListener("sw-update-available", handleUpdateAvailable);
      manager().stopPeriodicChecks();
    });
  });

  const checkForUpdates = async () => {
    setState({ status: "checking", startedAt: Date.now() });

    try {
      const versionInfo = await manager().checkForUpdates();

      if (versionInfo) {
        setState({
          status: "available",
          version: versionInfo.version,
          releaseNotes: versionInfo.releaseNotes,
          critical: versionInfo.critical,
        });
      } else {
        setState({ status: "idle", lastCheckedAt: Date.now() });
      }
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Update check failed",
      });
    }
  };

  const installUpdate = async () => {
    setState({ status: "downloading", progress: 0 });

    try {
      await manager().installUpdate();
      // Page will reload automatically
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Update installation failed",
      });
    }
  };

  const dismissUpdate = () => {
    setState({ status: "idle", lastCheckedAt: Date.now() });
  };

  return {
    state,
    checkForUpdates,
    installUpdate,
    dismissUpdate,
    manager: manager(),
  };
}
