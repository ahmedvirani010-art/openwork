# Phase 4: Component Migration Guide

**Date:** 2026-01-30
**Status:** Phase 4 Complete - Migration Reference
**Branch:** `claude/document-tech-stack-e7ZwZ`

---

## Overview

Phase 4 provides all the tools needed to make OpenWork components platform-aware. This guide shows how to update existing components that currently use Tauri APIs directly to work in both desktop and web modes.

---

## What's Available

### ✅ Core Platform Abstraction

- **`usePlatformAdapter()`** - React/Solid hook to access platform adapter
- **`IPlatformAdapter`** - TypeScript interface for all platform operations
- **`TauriAdapter`** - Desktop implementation (wraps Tauri)
- **`WebAdapter`** - Web implementation (uses browser APIs)
- **`PlatformAdapterProvider`** - Context provider (already integrated in `entry.tsx`)

### ✅ File Transfer Utilities

- `uploadFile()` - Upload files to server
- `downloadFile()` - Download files from server
- `uploadFiles()` - Batch upload with progress tracking
- `pickAndReadFile()` - Pick file from local filesystem
- `readFileAsText()` / `readFileAsDataURL()` / `readFileAsArrayBuffer()` - File reading utilities
- `downloadTextAsFile()` - Trigger browser download
- `pickFileHandle()` / `pickDirectoryHandle()` - File System Access API wrappers
- `saveFileHandle()` - Save file using File System Access API

### ✅ New Components

- **`ConnectionManager`** - Server connection UI for web mode
- **`WorkspaceSelector`** - Workspace management UI
- **`EngineControls`** - Platform-aware engine controls
- **`MonacoEditor`** - VS Code editor in browser (from Phase 3)
- **`UpdateBanner`** - Auto-update notification (from Phase 3)

---

## Migration Patterns

### Pattern 1: Direct Tauri API Replacement

**Before:**
```typescript
import { pickDirectory } from "@tauri-apps/plugin-dialog";

async function selectFolder() {
  const folder = await pickDirectory({ title: "Select Folder" });
  return folder;
}
```

**After:**
```typescript
import { usePlatformAdapter } from "~/lib/platform";

function MyComponent() {
  const adapter = usePlatformAdapter();

  async function selectFolder() {
    const folder = await adapter.pickDirectory({ title: "Select Folder" });
    return folder;
  }

  return <button onClick={selectFolder}>Select Folder</button>;
}
```

### Pattern 2: Capability-Based Rendering

**Before:**
```typescript
// Always show file picker button
return (
  <button onClick={handlePickFile}>
    Open File
  </button>
);
```

**After:**
```typescript
import { usePlatformAdapter } from "~/lib/platform";

function MyComponent() {
  const adapter = usePlatformAdapter();

  return (
    <Show when={adapter.capabilities.canAccessFileSystem}
          fallback={<p>File access not available in your browser</p>}>
      <button onClick={handlePickFile}>
        Open File
      </button>
    </Show>
  );
}
```

### Pattern 3: Platform-Specific Logic

**Before:**
```typescript
import { engineStart, engineStop } from "~/lib/tauri";

async function startEngine() {
  const info = await engineStart(projectDir);
  console.log("Engine started:", info);
}
```

**After:**
```typescript
import { usePlatformAdapter } from "~/lib/platform";

function EngineManager() {
  const adapter = usePlatformAdapter();

  async function startEngine() {
    if (adapter.capabilities.canManageEngine) {
      // Desktop: Direct engine control
      const info = await adapter.engineStart(projectDir);
      console.log("Engine started:", info);
    } else {
      // Web: Engine is managed by server
      console.log("Engine is server-managed");
    }
  }

  return (
    <Show when={adapter.capabilities.canManageEngine}
          fallback={<p>Engine is managed by the server</p>}>
      <button onClick={startEngine}>Start Engine</button>
    </Show>
  );
}
```

### Pattern 4: File Upload/Download

**Before:**
```typescript
// Desktop: Use native file operations
import { writeFile } from "@tauri-apps/plugin-fs";

async function saveContent(content: string) {
  await writeFile({ path: "/path/to/file.txt", contents: content });
}
```

**After:**
```typescript
import { usePlatformAdapter, downloadTextAsFile } from "~/lib/platform";

function Editor() {
  const adapter = usePlatformAdapter();
  const [content, setContent] = createSignal("");

  async function saveFile() {
    if (adapter.capabilities.canAccessFileSystem) {
      // Use File System Access API if available
      await adapter.writeFile({
        path: "/workspace/file.txt",
        contents: content()
      });
    } else {
      // Fallback: Trigger browser download
      downloadTextAsFile(content(), "file.txt", "text/plain");
    }
  }

  return (
    <div>
      <textarea value={content()} onInput={(e) => setContent(e.target.value)} />
      <button onClick={saveFile}>Save</button>
    </div>
  );
}
```

### Pattern 5: Workspace Management

**Before:**
```typescript
import { workspaceBootstrap, workspaceCreate } from "~/lib/tauri";

async function loadWorkspaces() {
  const ws = await workspaceBootstrap();
  setWorkspaces(ws.workspaces);
}
```

**After:**
```typescript
import { usePlatformAdapter } from "~/lib/platform";

function WorkspaceManager() {
  const adapter = usePlatformAdapter();
  const [workspaces, setWorkspaces] = createSignal([]);

  async function loadWorkspaces() {
    // Works on both desktop and web
    const ws = await adapter.workspaceBootstrap();
    setWorkspaces(ws.workspaces);
  }

  async function createWorkspace(name: string, path: string) {
    const ws = await adapter.workspaceCreate({
      folderPath: path,
      name,
      preset: "default"
    });
    setWorkspaces(ws.workspaces);
  }

  return (
    <div>
      <For each={workspaces()}>
        {(ws) => <div>{ws.name}</div>}
      </For>
    </div>
  );
}
```

---

## Real-World Migration Example

Let's migrate a component that picks a file and displays its content:

### Before (Desktop Only)

```typescript
import { createSignal } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

function FileViewer() {
  const [filePath, setFilePath] = createSignal("");
  const [content, setContent] = createSignal("");

  async function openFile() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Text", extensions: ["txt", "md"] }]
    });

    if (selected) {
      setFilePath(selected as string);
      const text = await readTextFile(selected as string);
      setContent(text);
    }
  }

  return (
    <div>
      <button onClick={openFile}>Open File</button>
      <Show when={filePath()}>
        <h3>{filePath()}</h3>
        <pre>{content()}</pre>
      </Show>
    </div>
  );
}
```

### After (Desktop + Web)

```typescript
import { createSignal, Show } from "solid-js";
import {
  usePlatformAdapter,
  pickAndReadFile,
  readFileAsText
} from "~/lib/platform";
import { MonacoEditor } from "~/components/monaco-editor";

function FileViewer() {
  const adapter = usePlatformAdapter();
  const [fileName, setFileName] = createSignal("");
  const [content, setContent] = createSignal("");

  async function openFile() {
    if (adapter.capabilities.canAccessFileSystem) {
      // Desktop or browsers with File System Access API
      const filePath = await adapter.pickFile({
        multiple: false,
        filters: { name: "Text", extensions: ["txt", "md"] }
      });

      if (filePath) {
        setFileName(Array.isArray(filePath) ? filePath[0] : filePath);
        const text = await adapter.readFile({
          path: Array.isArray(filePath) ? filePath[0] : filePath
        });
        setContent(text);
      }
    } else {
      // Fallback: Use HTML file input
      const files = await pickAndReadFile({
        accept: ".txt,.md",
        multiple: false
      });

      if (files.length > 0) {
        setFileName(files[0].name);
        const text = await readFileAsText(files[0]);
        setContent(text);
      }
    }
  }

  return (
    <div>
      <button onClick={openFile}>Open File</button>
      <Show when={fileName()}>
        <h3>{fileName()}</h3>

        {/* Use Monaco Editor for better viewing experience */}
        <Show when={adapter.name === "web"}
              fallback={<pre>{content()}</pre>}>
          <MonacoEditor
            filePath={fileName()}
            value={content()}
            readOnly={true}
          />
        </Show>
      </Show>
    </div>
  );
}
```

---

## Component Checklist

Use this checklist when migrating a component:

- [ ] **Import platform adapter**: Replace Tauri imports with `usePlatformAdapter`
- [ ] **Check capabilities**: Use `adapter.capabilities` to check what's available
- [ ] **Add fallbacks**: Provide alternative UI/logic for missing capabilities
- [ ] **Test both modes**: Verify component works in `pnpm dev` (desktop) and `pnpm dev:web` (web)
- [ ] **Update types**: Ensure TypeScript types match the adapter interface
- [ ] **Handle errors**: Platform operations can fail differently on web vs desktop

---

## Key Capabilities Reference

```typescript
interface PlatformCapabilities {
  // Engine Management
  canManageEngine: boolean;        // Start/stop OpenCode engine locally
  canInstallEngine: boolean;       // Install OpenCode CLI

  // File System
  canAccessFileSystem: boolean;    // Pick files/directories
  canWatchFiles: boolean;          // Watch files for changes (desktop only)

  // System Integration
  canOpenExternal: boolean;        // Open files in external apps
  canShowInFolder: boolean;        // Show file in system file manager
  canAccessClipboard: boolean;     // Read/write clipboard

  // Application
  canAutoUpdate: boolean;          // Auto-update application
  canAccessSystemInfo: boolean;    // Get OS/platform info

  // Storage
  canAccessPersistentStorage: boolean;  // LocalStorage or equivalent

  // Owpenbot (WhatsApp/Telegram)
  canRunOwpenbot: boolean;         // Run bot locally (desktop only)
}
```

### Desktop (TauriAdapter)

All capabilities are `true` - full native access

### Web (WebAdapter)

- ✅ `canAccessFileSystem` - Chrome 86+, Safari 15.2+ (File System Access API)
- ✅ `canAutoUpdate` - Service Worker handles updates
- ✅ `canAccessPersistentStorage` - LocalStorage + IndexedDB
- ❌ `canManageEngine` - Server manages engine (Docker)
- ❌ `canInstallEngine` - Not applicable
- ❌ `canWatchFiles` - Browser limitation
- ❌ `canOpenExternal` - Use `window.open()` instead
- ❌ `canShowInFolder` - Browser limitation
- ❌ `canAccessClipboard` - Use Clipboard API separately
- ❌ `canAccessSystemInfo` - Limited to `navigator.userAgent`
- ❌ `canRunOwpenbot` - Cloud service (Phase 5)

---

## Common Patterns Summary

### 1. **Check Runtime**
```typescript
const adapter = usePlatformAdapter();
if (adapter.name === "desktop") {
  // Desktop-specific
} else {
  // Web-specific
}
```

### 2. **Check Capability**
```typescript
if (adapter.capabilities.canManageEngine) {
  await adapter.engineStart(dir);
}
```

### 3. **Provide Fallback**
```typescript
<Show when={adapter.capabilities.canAccessFileSystem}
      fallback={<UploadButton />}>
  <FilePicker />
</Show>
```

### 4. **Use File Transfer Utilities**
```typescript
import { uploadFile, downloadFile } from "~/lib/platform";

await uploadFile({
  file,
  destinationPath: "/workspace/file.txt",
  serverUrl: baseUrl
});
```

---

## Testing

### Desktop Mode
```bash
cd packages/app
pnpm dev
```

### Web Mode
```bash
cd packages/app
pnpm dev:web
```

### Production Web Build
```bash
cd packages/app
pnpm build:web
pnpm preview:web
```

---

## Files to Migrate (Priority Order)

Based on Grep results, these files use Tauri APIs and should be migrated:

### High Priority (Core Functionality)
1. **`app/context/workspace.ts`** - Workspace management, engine control
   - Lines: 1548 (very complex)
   - Impact: High - Core app functionality
   - Recommendation: Migrate incrementally, test thoroughly

2. **`app/pages/session.tsx`** - Session management, file operations
   - Check for file operations that need platform adapter

3. **`app/context/extensions.ts`** - Extension/plugin management
   - Check for file system operations

### Medium Priority (UI Features)
4. **`app/app.tsx`** - Main app component
   - Check for platform-specific initialization

5. **`app/pages/mcp.tsx`** - MCP (Model Context Protocol) page
   - Check for file/directory operations

6. **`app/components/mcp-auth-modal.tsx`** - MCP authentication
   - Check for secure storage operations

### Low Priority (System State)
7. **`app/system-state.ts`** - System state management
   - Check for platform info access

8. **`app/lib/tauri.ts`** - Tauri wrapper (already abstracted)
   - This is the low-level wrapper, keep for desktop mode
   - Platform adapter uses this internally for TauriAdapter

---

## Migration Strategy

### Option 1: Gradual Migration (Recommended)
- Start with new features using platform adapter
- Migrate existing components as needed
- Desktop mode continues working unchanged
- Lower risk, faster deployment

### Option 2: Full Migration
- Update all components to use platform adapter
- Remove direct Tauri imports from components
- Comprehensive testing required
- Higher risk, cleaner codebase

### Option 3: Hybrid Approach
- Core components (workspace, engine) keep Tauri for now
- UI components migrate to platform adapter
- Desktop uses Tauri directly, web uses adapter
- Maintain compatibility layer

**Recommendation:** Start with Option 1 (Gradual Migration). The platform adapter is already integrated in `entry.tsx`, so new components can use it immediately. Existing components work unchanged in desktop mode.

---

## Phase 4 Complete ✅

### What's Ready
- ✅ Platform abstraction layer (Phase 2)
- ✅ Web-specific features (Phase 3: Service Worker, PWA, Monaco)
- ✅ File transfer utilities (Phase 4)
- ✅ Workspace selector component (Phase 4)
- ✅ Engine controls component (Phase 4)
- ✅ Connection manager component (Phase 4)
- ✅ All components integrated in app entry (Phase 4)

### What's Next
- Phase 5: Server-side features (Docker API, Owpenbot)
- Phase 6: Deployment configuration
- Phase 7: Testing and polish

---

## Questions?

If you have questions about migrating specific components:

1. Check if the operation is in `IPlatformAdapter` interface (`lib/platform/types.ts`)
2. Look at existing component examples (`ConnectionManager`, `WorkspaceSelector`, `EngineControls`)
3. Use capability checks to provide appropriate fallbacks
4. Test in both desktop (`pnpm dev`) and web (`pnpm dev:web`) modes

---

**Last Updated:** 2026-01-30
**Status:** Phase 4 Complete - Ready for Phase 5
**Branch:** `claude/document-tech-stack-e7ZwZ`
