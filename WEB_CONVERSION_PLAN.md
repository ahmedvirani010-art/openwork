# OpenWork Web Conversion Plan

**Version:** 1.0
**Created:** 2026-01-30
**Effort Estimate:** 2-3 weeks for MVP
**Status:** Planning Phase

## Executive Summary

This document outlines the strategy for converting OpenWork from a Tauri-based desktop application to a dual-mode system supporting both desktop and web deployments. The web version will be a lightweight remote controller that connects to a running OpenCode server, while the desktop version will remain the full-featured host.

### Key Objectives

1. **Enable web-based access** to OpenWork functionality through standard browsers
2. **Maintain desktop app** as the full-featured host with native capabilities
3. **Share core UI components** between desktop and web builds
4. **Leverage existing OpenWork Server** for remote client support
5. **Minimize breaking changes** to existing desktop users

### Success Criteria

- ✅ Web app can connect to remote OpenCode servers
- ✅ Core workflows (sessions, tasks, permissions) work identically in web mode
- ✅ Deployment via Docker or static hosting is straightforward
- ✅ Desktop app maintains all existing features
- ✅ Codebase remains maintainable with shared components

---

## Current State Analysis

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│         Tauri Desktop App (Current)         │
├─────────────────────────────────────────────┤
│  Solid.js UI (packages/app)                 │
│  ├─ Tauri IPC Commands (34 commands)        │
│  ├─ File System Access (native dialogs)     │
│  ├─ Engine Management (start/stop)          │
│  └─ Owpenbot (WhatsApp/Telegram)            │
├─────────────────────────────────────────────┤
│  Tauri Rust Backend (packages/desktop)      │
│  ├─ OpenCode Server Sidecar                 │
│  ├─ OpenWork Server Sidecar                 │
│  └─ Native OS Integration                   │
└─────────────────────────────────────────────┘
```

### Existing Infrastructure

**Already Web-Ready:**
- ✅ OpenWork Server (`packages/server`) - REST API for remote clients
- ✅ Solid.js + Vite - Standard web framework
- ✅ Dual-mode architecture - "Host" vs "Client" modes
- ✅ 77 `isTauriRuntime()` guards - Well-isolated platform code
- ✅ Planning documents exist - PRDs for web-only mode

**Needs Adaptation:**
- ⚠️ 34 Tauri commands - Need web alternatives or graceful degradation
- ⚠️ Native file dialogs - Replace with web upload/download
- ⚠️ File system access - Limited to server permissions
- ⚠️ Engine management - Users must run OpenCode separately
- ⚠️ Owpenbot integration - Desktop-only feature

---

## Target Architecture

### Dual-Mode System

```
┌──────────────────────────┐       ┌──────────────────────────┐
│   Desktop App (Host)     │       │   Web App (Client)       │
├──────────────────────────┤       ├──────────────────────────┤
│  Full Features:          │       │  Remote Features:        │
│  ✓ Engine Management     │       │  ✓ Session Control       │
│  ✓ File System Access    │       │  ✓ Task Management       │
│  ✓ Owpenbot              │       │  ✓ Permission Review     │
│  ✓ Native Dialogs        │       │  ✓ Config Viewing        │
│  ✓ Auto-Updates          │       │  ✗ Engine Management     │
│  ✓ Local Workspaces      │       │  ✗ Owpenbot              │
│                          │       │  ✗ File Opening          │
└──────────────────────────┘       └──────────────────────────┘
           │                                  │
           │                                  │
           ▼                                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Shared UI Components Layer                     │
│  (Sessions, Tasks, Messages, Permissions, Settings)         │
└─────────────────────────────────────────────────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────────┐       ┌──────────────────────────┐
│  Local OpenCode Server   │       │  Remote OpenCode Server  │
│  (127.0.0.1:4096)        │       │  (user-provided URL)     │
└──────────────────────────┘       └──────────────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────────┐       ┌──────────────────────────┐
│  OpenWork Server (local) │       │  OpenWork Server (remote)│
│  (config management)     │       │  (via bearer auth)       │
└──────────────────────────┘       └──────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Analysis & Planning (2-3 days)

**Objectives:**
- Complete audit of all Tauri dependencies
- Design platform abstraction layer
- Define API contracts for web/desktop modes

**Tasks:**
1. ✅ Audit all 34 Tauri commands and their usage
2. ✅ Map UI components to platform capabilities
3. ✅ Document OpenWork Server API requirements
4. Create abstraction interface for platform operations

**Deliverables:**
- Platform abstraction interface (`IPlatformAdapter`)
- API contract documentation
- Risk assessment for breaking changes

---

### Phase 2: Platform Abstraction Layer (3-4 days)

**Objectives:**
- Create adapter pattern for platform-specific operations
- Implement both Tauri and Web adapters
- Enable runtime switching between modes

**Architecture:**

```typescript
// packages/app/src/app/lib/platform/types.ts
export interface IPlatformAdapter {
  // File operations
  pickDirectory(): Promise<string | null>;
  pickFile(filters?: FileFilter[]): Promise<string | null>;
  saveFile(options: SaveOptions): Promise<string | null>;

  // Workspace operations
  createWorkspace(path: string, config: WorkspaceConfig): Promise<void>;
  getWorkspaces(): Promise<Workspace[]>;

  // Engine operations (optional)
  startEngine?(): Promise<void>;
  stopEngine?(): Promise<void>;
  getEngineInfo?(): Promise<EngineInfo>;

  // Config operations
  readConfig(workspaceId: string): Promise<OpencodeConfig>;
  writeConfig(workspaceId: string, config: OpencodeConfig): Promise<void>;

  // Capabilities
  capabilities: {
    canManageEngine: boolean;
    canAccessFileSystem: boolean;
    canRunOwpenbot: boolean;
    canAutoUpdate: boolean;
  };
}
```

**Implementations:**

1. **TauriAdapter** (`platform/tauri-adapter.ts`)
   - Uses existing Tauri commands
   - Full file system access
   - Engine management support

2. **WebAdapter** (`platform/web-adapter.ts`)
   - Uses OpenWork Server API
   - File upload/download via forms
   - Limited to remote operations

**Tasks:**
1. Create `IPlatformAdapter` interface
2. Implement `TauriAdapter` (wrap existing code)
3. Implement `WebAdapter` (call OpenWork Server)
4. Create platform provider/context for Solid.js
5. Update all Tauri command usage to use adapter

**Deliverables:**
- `/packages/app/src/app/lib/platform/` directory
- Both adapters implemented and tested
- Migration guide for component authors

---

### Phase 3: Web-Specific Features (3-4 days)

**Objectives:**
- Replace native file dialogs with web alternatives
- Implement web storage layer
- Create connection manager for remote servers

#### 3.1 File Operations

**Replace:**
- Native directory picker → Workspace dropdown + connection form
- Native file upload → Web file input with drag-drop
- Native save dialog → Browser download with filename

**Components:**

```tsx
// Connection Manager
<ConnectionManager>
  <ServerInput placeholder="http://opencode-server:4096" />
  <TokenInput placeholder="Bearer token (optional)" />
  <ConnectButton />
  <SavedConnections />
</ConnectionManager>

// Workspace Selector (replaces folder picker)
<WorkspaceSelector>
  <WorkspaceList items={availableWorkspaces} />
  <CreateWorkspaceForm>
    <NameInput />
    <PathInput /> {/* disabled in web mode */}
    <ConfigUpload /> {/* upload workspace.json */}
  </CreateWorkspaceForm>
</WorkspaceSelector>
```

#### 3.2 Storage Layer

**IndexedDB Schema:**

```typescript
// sessions DB
{
  sessions: {
    id: string;
    workspaceId: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
  }
}

// settings DB
{
  connections: {
    id: string;
    url: string;
    name: string;
    lastUsed: number;
  },
  preferences: {
    theme: string;
    defaultWorkspace: string;
    ...
  }
}
```

**Implementation:**
- Use `idb` library for IndexedDB wrapper
- Migrate from Tauri's `@tauri-apps/plugin-storage`
- Sync critical data with OpenWork Server

**Tasks:**
1. Implement connection manager UI
2. Create workspace selector component
3. Build file upload/download utilities
4. Implement IndexedDB storage layer
5. Add localStorage fallback for preferences

---

### Phase 4: UI Refactoring (2-3 days)

**Objectives:**
- Remove direct Tauri imports from core components
- Update runtime checks for graceful degradation
- Hide or disable desktop-only features in web mode

#### Component Updates

**Before:**
```typescript
import { invoke } from '@tauri-apps/api/core';

async function loadWorkspaces() {
  const workspaces = await invoke('workspace_list');
  return workspaces;
}
```

**After:**
```typescript
import { usePlatform } from '~/lib/platform';

async function loadWorkspaces() {
  const platform = usePlatform();
  const workspaces = await platform.getWorkspaces();
  return workspaces;
}
```

#### Feature Gating

```tsx
function SettingsPanel() {
  const platform = usePlatform();

  return (
    <div>
      <SessionSettings />
      <PermissionSettings />

      {platform.capabilities.canManageEngine && (
        <EngineSettings />
      )}

      {platform.capabilities.canRunOwpenbot && (
        <OwpenbotSettings />
      )}

      {!platform.capabilities.canAccessFileSystem && (
        <Notice>File system access is limited in web mode</Notice>
      )}
    </div>
  );
}
```

**Tasks:**
1. Create platform context provider
2. Replace all `invoke()` calls with adapter methods
3. Update `isTauriRuntime()` checks to use capabilities
4. Add feature flags for desktop-only components
5. Create web-specific onboarding flow

---

### Phase 5: Build Configuration (1-2 days)

**Objectives:**
- Separate build configs for desktop and web
- Optimize web bundle size
- Configure environment variables

#### Vite Configuration

**packages/app/vite.config.web.ts:**
```typescript
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    outDir: 'dist-web',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['solid-js', '@solidjs/router'],
          sdk: ['@opencode-ai/sdk'],
        },
      },
    },
  },
  define: {
    'import.meta.env.VITE_PLATFORM': JSON.stringify('web'),
  },
});
```

**Build Scripts (package.json):**
```json
{
  "scripts": {
    "build:web": "vite build --config vite.config.web.ts",
    "build:desktop": "vite build && cargo tauri build",
    "dev:web": "vite dev --config vite.config.web.ts",
    "dev:desktop": "cargo tauri dev"
  }
}
```

**Tasks:**
1. Create separate Vite config for web
2. Set up environment variables for platform detection
3. Configure build outputs
4. Optimize bundle splitting
5. Add source maps for debugging

---

### Phase 6: Deployment Infrastructure (2-3 days)

**Objectives:**
- Containerize web app + OpenWork Server
- Set up reverse proxy
- Configure security and CORS

#### Docker Setup

**Dockerfile.web:**
```dockerfile
# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install
RUN bun run build:web

# Production stage
FROM nginx:alpine
COPY --from=builder /app/packages/app/dist-web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  opencode:
    image: opencode-ai/opencode:latest
    ports:
      - "4096:4096"
    volumes:
      - ./workspace:/workspace
    environment:
      - OPENCODE_MODEL=anthropic/claude-3-5-sonnet-20241022

  openwork-server:
    build:
      context: ./packages/server
    ports:
      - "3001:3001"
    environment:
      - OPENCODE_URL=http://opencode:4096
      - AUTH_REQUIRED=true
    depends_on:
      - opencode

  openwork-web:
    build:
      context: .
      dockerfile: Dockerfile.web
    ports:
      - "80:80"
    environment:
      - VITE_OPENCODE_URL=http://localhost:4096
      - VITE_OPENWORK_SERVER_URL=http://localhost:3001
    depends_on:
      - openwork-server
```

#### nginx Configuration

**nginx.conf:**
```nginx
http {
  server {
    listen 80;
    server_name _;

    # Web app
    location / {
      root /usr/share/nginx/html;
      try_files $uri $uri/ /index.html;

      # Security headers
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
    }

    # Proxy to OpenCode
    location /api/opencode/ {
      proxy_pass http://opencode:4096/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }

    # Proxy to OpenWork Server
    location /api/openwork/ {
      proxy_pass http://openwork-server:3001/;
    }
  }
}
```

**Tasks:**
1. Create Dockerfile for web app
2. Create Docker Compose configuration
3. Set up nginx reverse proxy
4. Configure CORS policies
5. Add SSL/TLS support (Let's Encrypt)
6. Create deployment scripts

---

### Phase 7: Testing & Validation (3-5 days)

**Objectives:**
- Verify all core workflows in web mode
- Cross-browser compatibility
- Mobile responsiveness
- Performance benchmarking

#### Test Plan

**Core Workflows:**
1. ✅ Connect to remote OpenCode server
2. ✅ View and manage sessions
3. ✅ Create and complete tasks
4. ✅ Review and approve permissions
5. ✅ View workspace configuration
6. ✅ Update settings and preferences
7. ✅ Handle SSE events (session updates)

**Browser Matrix:**
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

**Performance Targets:**
- Initial load: < 3s on 3G
- Bundle size: < 500KB gzipped
- Time to interactive: < 5s
- SSE latency: < 100ms

**Tasks:**
1. Create automated test suite for web mode
2. Manual testing on all browsers
3. Mobile device testing (responsive design)
4. Performance profiling and optimization
5. Load testing with multiple concurrent users
6. Security audit (XSS, CSRF, auth)

---

### Phase 8: Documentation (2 days)

**Objectives:**
- Deployment guide for self-hosting
- User migration guide
- Developer documentation

#### Documentation Structure

**1. Deployment Guide** (`docs/WEB_DEPLOYMENT.md`)
- Docker Compose quickstart
- Environment variables reference
- SSL/TLS setup
- Backup and maintenance

**2. User Guide** (`docs/WEB_VS_DESKTOP.md`)
- Feature comparison table
- When to use web vs desktop
- Migration instructions
- Troubleshooting

**3. Developer Guide** (`docs/PLATFORM_ADAPTERS.md`)
- Architecture overview
- Adding new platform capabilities
- Testing platform-specific code
- Contributing guidelines

**Tasks:**
1. Write deployment documentation
2. Create feature comparison matrix
3. Document platform adapter API
4. Add troubleshooting guide
5. Update README with web deployment info

---

### Phase 9: Polish & Optimization (2-3 days)

**Objectives:**
- Optimize bundle size
- Progressive Web App features
- Offline support where possible

#### PWA Manifest

**public/manifest.json:**
```json
{
  "name": "OpenWork",
  "short_name": "OpenWork",
  "description": "AI-powered workspace controller",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### Service Worker

**Features:**
- Cache static assets
- Offline fallback page
- Background sync for pending actions
- Push notifications (future)

**Tasks:**
1. Implement code splitting for route-based chunks
2. Add PWA manifest and icons
3. Create service worker for offline support
4. Optimize images and assets
5. Add loading states and skeletons

---

## Technical Decisions

### 1. Platform Detection Strategy

**Runtime Detection:**
```typescript
export const PLATFORM_MODE =
  typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__
    ? 'desktop'
    : 'web';
```

**Build-time Configuration:**
```typescript
const PLATFORM = import.meta.env.VITE_PLATFORM ?? 'web';
```

**Decision:** Use both runtime and build-time detection
- Build-time for code elimination (smaller bundles)
- Runtime for graceful degradation

### 2. State Management

**Current:** Solid.js signals + context providers

**Web Additions:**
- IndexedDB for persistent session data
- localStorage for UI preferences
- Sync critical state with OpenWork Server

**Decision:** Enhance existing patterns, don't replace

### 3. Authentication

**Desktop:** No auth (localhost only)

**Web:** Bearer token authentication
- Users generate tokens from desktop app
- Tokens stored in localStorage
- Refresh flow via OpenWork Server

**Decision:** Optional auth in web mode, required for production deployments

### 4. File Operations

**Desktop:** Full file system access via Tauri

**Web Options:**
1. File upload/download only (chosen)
2. File System Access API (limited browser support)
3. WebDAV bridge (complex)

**Decision:** Use standard file upload/download for maximum compatibility

### 5. Real-time Updates

**Current:** SSE (Server-Sent Events) from OpenCode

**Web:** Same SSE approach
- Works in all browsers
- No WebSocket complexity
- Already implemented

**Decision:** No changes needed

---

## Migration Path for Existing Users

### Desktop Users (No Impact)

- Desktop app continues to work identically
- All existing features preserved
- Optional: can access workspaces via web remotely

### New Web-Only Users

**Setup Flow:**
1. Deploy OpenCode + OpenWork Server (Docker Compose)
2. Access web UI at `http://your-server/`
3. Connect to OpenCode server
4. Create or import workspace
5. Start using sessions

**Limitations:**
- Cannot manage OpenCode engine
- Cannot use Owpenbot (WhatsApp/Telegram)
- Cannot open files directly from UI
- Limited to server-defined workspace paths

---

## Rollout Strategy

### Alpha (Week 1-2)

**Goals:**
- Core platform abstraction complete
- Basic web UI functional
- Docker deployment working

**Audience:** Internal testing only

### Beta (Week 3-4)

**Goals:**
- All core workflows tested
- Documentation complete
- Performance optimized

**Audience:** Early adopters, self-hosted users

**Feedback Collection:**
- GitHub Discussions
- User interviews
- Analytics (opt-in)

### General Availability (Week 5+)

**Requirements:**
- ✅ All P0 bugs resolved
- ✅ Cross-browser testing complete
- ✅ Security audit passed
- ✅ Documentation published
- ✅ Migration guide available

**Launch Artifacts:**
- Release notes
- Demo video
- Blog post
- Updated README

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking desktop app | Critical | Extensive testing, feature flags |
| Security vulnerabilities | Critical | Audit, rate limiting, auth |
| Performance degradation | High | Bundle optimization, lazy loading |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser compatibility issues | Medium | Polyfills, progressive enhancement |
| Deployment complexity | Medium | Docker Compose, clear docs |
| State sync conflicts | Medium | Optimistic updates, conflict resolution |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| User confusion about modes | Low | Clear documentation, tooltips |
| Missing niche features | Low | Feature parity roadmap |

---

## Success Metrics

### Technical Metrics

- ✅ Bundle size < 500KB gzipped
- ✅ Initial load < 3s on 3G
- ✅ All core workflows functional
- ✅ 0 desktop regressions
- ✅ 100% browser compatibility (Chrome, Firefox, Safari, Edge)

### User Metrics

- 🎯 10+ successful self-hosted deployments in first month
- 🎯 < 5% regression in desktop user satisfaction
- 🎯 50+ GitHub stars from web users
- 🎯 < 10% bounce rate on web landing

### Business Metrics

- 📈 Increased accessibility (no installation required)
- 📈 Lower barrier to entry for new users
- 📈 Enterprise deployment options (self-hosted)
- 📈 Mobile workflow support (future)

---

## Timeline

### Week 1: Foundation
- Days 1-2: Platform abstraction design & implementation
- Days 3-4: Tauri adapter extraction
- Day 5: Web adapter scaffolding

### Week 2: Core Features
- Days 1-2: File operations & workspace selector
- Days 3-4: Storage layer (IndexedDB)
- Day 5: Connection manager UI

### Week 3: Integration & Polish
- Days 1-2: UI refactoring & component updates
- Days 3-4: Build configuration & optimization
- Day 5: Docker setup

### Week 4: Testing & Documentation
- Days 1-2: Cross-browser testing
- Days 3-4: Documentation writing
- Day 5: Final polish & PWA features

### Week 5: Beta Release
- Deploy beta version
- Gather feedback
- Iterate on issues

---

## Next Steps

### Immediate Actions

1. **Get stakeholder approval** for this plan
2. **Set up project board** with all tasks
3. **Create feature branch** `feat/web-conversion`
4. **Begin Phase 1** (platform abstraction design)

### Team Needs

- **1 Frontend Engineer** - Platform abstraction, UI refactoring
- **1 DevOps Engineer** - Docker, deployment infrastructure
- **1 QA Engineer** - Cross-browser testing, validation
- **Designer** (part-time) - Web-specific UI adjustments

### Open Questions

1. Should we maintain separate repos or monorepo for web/desktop?
2. What's the hosted version strategy (cloud offering)?
3. Do we need a migration tool for existing desktop configs?
4. Should mobile apps (iOS/Android) use the same web UI or native?

---

## Appendix

### A. Feature Comparison Matrix

| Feature | Desktop | Web |
|---------|---------|-----|
| Session management | ✅ Full | ✅ Full |
| Task creation | ✅ Full | ✅ Full |
| Permission review | ✅ Full | ✅ Full |
| Workspace config viewing | ✅ Full | ✅ Full |
| Workspace config editing | ✅ Full | ⚠️ Via server API |
| OpenCode engine management | ✅ Full | ❌ Not supported |
| File system browsing | ✅ Native | ❌ Not supported |
| File upload/download | ✅ Native | ✅ Web forms |
| Owpenbot (WhatsApp/Telegram) | ✅ Full | ❌ Not supported |
| Auto-updates | ✅ Native | ⚠️ Browser refresh |
| Offline support | ✅ Full | ⚠️ Limited (PWA cache) |
| Push notifications | ❌ Future | ⚠️ Future (web push) |

### B. API Endpoints (OpenWork Server)

All endpoints required for web client operation:

**Workspace Management:**
```
GET    /workspaces
GET    /workspaces/:id
POST   /workspaces
PATCH  /workspaces/:id
DELETE /workspaces/:id
```

**Configuration:**
```
GET    /workspaces/:id/config
PATCH  /workspaces/:id/config
GET    /workspaces/:id/export
POST   /workspaces/:id/import
```

**Plugins & Skills:**
```
GET    /workspaces/:id/plugins
POST   /workspaces/:id/plugins
DELETE /workspaces/:id/plugins/:name

GET    /workspaces/:id/skills
POST   /workspaces/:id/skills
DELETE /workspaces/:id/skills/:name
```

**MCP Servers:**
```
GET    /workspaces/:id/mcp
POST   /workspaces/:id/mcp
DELETE /workspaces/:id/mcp/:name
```

### C. Environment Variables

**Web App:**
```bash
VITE_PLATFORM=web
VITE_OPENCODE_URL=http://localhost:4096
VITE_OPENWORK_SERVER_URL=http://localhost:3001
VITE_ENABLE_ANALYTICS=false
```

**OpenWork Server:**
```bash
OPENCODE_URL=http://localhost:4096
PORT=3001
AUTH_REQUIRED=true
CORS_ORIGINS=http://localhost:5173,https://app.example.com
LOG_LEVEL=info
```

**OpenCode Server:**
```bash
OPENCODE_MODEL=anthropic/claude-3-5-sonnet-20241022
OPENCODE_PORT=4096
ANTHROPIC_API_KEY=sk-...
```

### D. Bundle Size Analysis

**Target Bundle Breakdown:**
```
vendor.js       - 200KB (solid-js, router, UI libs)
sdk.js          - 100KB (@opencode-ai/sdk)
app.js          - 150KB (app code)
styles.css      - 50KB  (Tailwind)
---
Total           - 500KB (before gzip)
Gzipped         - ~150KB
```

**Optimization Strategies:**
- Route-based code splitting
- Tree-shaking unused SDK methods
- Tailwind CSS purging
- Image optimization (WebP)
- Lazy load non-critical components

---

**Document Maintained By:** OpenWork Team
**Last Updated:** 2026-01-30
**Review Cycle:** Weekly during implementation
