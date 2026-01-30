/**
 * Monaco Editor Component
 *
 * In-browser code editor powered by Monaco (VS Code's editor engine).
 * Provides syntax highlighting, IntelliSense, and editing capabilities.
 */

import { createEffect, onCleanup, onMount, Show, createSignal } from "solid-js";
import * as monaco from "monaco-editor";

export interface MonacoEditorProps {
  /** File path or name (used for language detection) */
  filePath: string;

  /** Initial content */
  value?: string;

  /** Language override (auto-detected from filePath if not provided) */
  language?: string;

  /** Editor theme */
  theme?: "vs-dark" | "vs-light" | "hc-black";

  /** Read-only mode */
  readOnly?: boolean;

  /** Show minimap */
  minimap?: boolean;

  /** Word wrap */
  wordWrap?: "off" | "on" | "wordWrapColumn" | "bounded";

  /** Tab size */
  tabSize?: number;

  /** Insert spaces instead of tabs */
  insertSpaces?: boolean;

  /** Callback when content changes */
  onChange?: (value: string) => void;

  /** Callback when content is saved (Cmd/Ctrl+S) */
  onSave?: (value: string) => void;

  /** Height of editor (default: 90vh) */
  height?: string;
}

/**
 * Detect language from file path
 */
function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    jsonc: "json",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    md: "markdown",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    php: "php",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    sql: "sql",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    dockerfile: "dockerfile",
  };

  return languageMap[ext || ""] || "plaintext";
}

export function MonacoEditor(props: MonacoEditorProps) {
  let containerRef: HTMLDivElement | undefined;
  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  const [isLoading, setIsLoading] = createSignal(true);

  onMount(() => {
    if (!containerRef) return;

    // Configure Monaco
    monaco.editor.defineTheme("openwork-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0a0a0a",
      },
    });

    // Create editor instance
    const language = props.language || detectLanguage(props.filePath);
    editor = monaco.editor.create(containerRef, {
      value: props.value || "",
      language,
      theme: props.theme || "openwork-dark",
      readOnly: props.readOnly ?? false,
      minimap: {
        enabled: props.minimap ?? true,
      },
      wordWrap: props.wordWrap || "on",
      tabSize: props.tabSize || 2,
      insertSpaces: props.insertSpaces ?? true,
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: "on",
      renderWhitespace: "selection",
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      folding: true,
      foldingStrategy: "indentation",
      showFoldingControls: "always",
      matchBrackets: "always",
      formatOnPaste: true,
      formatOnType: true,
    });

    setIsLoading(false);

    // Listen for content changes
    editor.onDidChangeModelContent(() => {
      const value = editor?.getValue() || "";
      props.onChange?.(value);
    });

    // Handle save command (Cmd/Ctrl+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const value = editor?.getValue() || "";
      props.onSave?.(value);
    });

    // Focus editor
    editor.focus();
  });

  // Update value when prop changes
  createEffect(() => {
    if (!editor || !props.value) return;

    const currentValue = editor.getValue();
    if (currentValue !== props.value) {
      editor.setValue(props.value);
    }
  });

  // Update language when filePath changes
  createEffect(() => {
    if (!editor) return;

    const language = props.language || detectLanguage(props.filePath);
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  });

  // Update theme
  createEffect(() => {
    if (!editor) return;
    monaco.editor.setTheme(props.theme || "openwork-dark");
  });

  // Update readOnly
  createEffect(() => {
    if (!editor) return;
    editor.updateOptions({ readOnly: props.readOnly ?? false });
  });

  onCleanup(() => {
    editor?.dispose();
  });

  return (
    <div class="relative" style={{ height: props.height || "90vh" }}>
      <Show when={isLoading()}>
        <div class="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div class="flex flex-col items-center gap-3">
            <svg class="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
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
            <span class="text-sm text-gray-400">Loading editor...</span>
          </div>
        </div>
      </Show>

      <div ref={containerRef} class="w-full h-full" />
    </div>
  );
}

/**
 * Monaco Diff Editor Component
 *
 * Shows side-by-side comparison of two versions of a file
 */
export interface MonacoDiffEditorProps {
  /** Original content (left side) */
  original: string;

  /** Modified content (right side) */
  modified: string;

  /** File path for language detection */
  filePath: string;

  /** Language override */
  language?: string;

  /** Editor theme */
  theme?: "vs-dark" | "vs-light" | "hc-black";

  /** Read-only mode */
  readOnly?: boolean;

  /** Height of editor */
  height?: string;
}

export function MonacoDiffEditor(props: MonacoDiffEditorProps) {
  let containerRef: HTMLDivElement | undefined;
  let editor: monaco.editor.IStandaloneDiffEditor | undefined;
  const [isLoading, setIsLoading] = createSignal(true);

  onMount(() => {
    if (!containerRef) return;

    const language = props.language || detectLanguage(props.filePath);

    // Create models
    const originalModel = monaco.editor.createModel(props.original, language);
    const modifiedModel = monaco.editor.createModel(props.modified, language);

    // Create diff editor
    editor = monaco.editor.createDiffEditor(containerRef, {
      theme: props.theme || "openwork-dark",
      readOnly: props.readOnly ?? true,
      automaticLayout: true,
      renderSideBySide: true,
      fontSize: 14,
    });

    editor.setModel({
      original: originalModel,
      modified: modifiedModel,
    });

    setIsLoading(false);
  });

  onCleanup(() => {
    editor?.dispose();
  });

  return (
    <div class="relative" style={{ height: props.height || "90vh" }}>
      <Show when={isLoading()}>
        <div class="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div class="flex flex-col items-center gap-3">
            <svg class="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
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
            <span class="text-sm text-gray-400">Loading diff editor...</span>
          </div>
        </div>
      </Show>

      <div ref={containerRef} class="w-full h-full" />
    </div>
  );
}
