/**
 * Platform Detection Utilities
 *
 * Determines the current runtime environment (desktop or web)
 */

/**
 * Platform mode type
 */
export type PlatformMode = "desktop" | "web";

/**
 * Detect if running in Tauri runtime
 */
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ != null;
}

/**
 * Get current platform mode
 */
export function getPlatformMode(): PlatformMode {
  // Check for build-time environment variable first
  const buildTimePlatform = import.meta.env.VITE_PLATFORM;
  if (buildTimePlatform === "web") {
    return "web";
  }

  // Runtime detection
  return isTauriRuntime() ? "desktop" : "web";
}

/**
 * Check if File System Access API is available
 * https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 */
export function hasFileSystemAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    "showDirectoryPicker" in window &&
    "showOpenFilePicker" in window &&
    "showSaveFilePicker" in window
  );
}

/**
 * Check if Service Worker is available
 */
export function hasServiceWorker(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Check if WebSocket is available
 */
export function hasWebSocket(): boolean {
  return typeof window !== "undefined" && "WebSocket" in window;
}

/**
 * Check if IndexedDB is available
 */
export function hasIndexedDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

/**
 * Get browser information
 */
export function getBrowserInfo(): {
  name: string;
  version: string;
  engine: string;
} {
  if (typeof navigator === "undefined") {
    return { name: "unknown", version: "unknown", engine: "unknown" };
  }

  const ua = navigator.userAgent;
  let name = "Unknown";
  let version = "Unknown";
  let engine = "Unknown";

  // Detect browser
  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    name = "Chrome";
    version = ua.match(/Chrome\/(\d+)/)?.[1] ?? "Unknown";
    engine = "Blink";
  } else if (ua.includes("Edg")) {
    name = "Edge";
    version = ua.match(/Edg\/(\d+)/)?.[1] ?? "Unknown";
    engine = "Blink";
  } else if (ua.includes("Firefox")) {
    name = "Firefox";
    version = ua.match(/Firefox\/(\d+)/)?.[1] ?? "Unknown";
    engine = "Gecko";
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    name = "Safari";
    version = ua.match(/Version\/(\d+)/)?.[1] ?? "Unknown";
    engine = "WebKit";
  }

  return { name, version, engine };
}

/**
 * Check if current browser/environment supports all required features
 */
export function checkBrowserCompatibility(): {
  compatible: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required features
  if (!hasWebSocket()) {
    missing.push("WebSocket");
  }
  if (!hasIndexedDB()) {
    missing.push("IndexedDB");
  }

  // Optional but recommended features
  if (!hasFileSystemAccess()) {
    warnings.push("File System Access API (file operations will be limited)");
  }
  if (!hasServiceWorker()) {
    warnings.push("Service Worker (offline support and auto-updates will be unavailable)");
  }

  return {
    compatible: missing.length === 0,
    missing,
    warnings,
  };
}
