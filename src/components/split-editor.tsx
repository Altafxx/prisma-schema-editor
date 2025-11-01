"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Editor from "@monaco-editor/react";
import { DiagramCanvas } from "./diagram-canvas";
import { FileExplorer } from "./file-explorer";
import { parsePrismaSchema } from "@/lib/prisma-parser";
import { useSchemaStore } from "@/store/schema-store";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { Node, Edge } from "reactflow";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export function SplitEditor() {
    const {
        schemaFiles,
        activeFileId,
        parsedSchema,
        error,
        getMergedSchema,
        updateSchemaFile,
        setParsedSchema,
        setError,
        saveSchema,
    } = useSchemaStore();

    const [isSaving, setIsSaving] = useState(false);
    const lastSaveRef = useRef<number>(Date.now());

    const activeFile = schemaFiles.find((f) => f.name === activeFileId) || schemaFiles[0];
    const activeContent = activeFile?.content || "";

    const editorRef = useRef<any>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isUpdatingFromDiagramRef = useRef(false);
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize schema on mount
    useEffect(() => {
        try {
            const mergedSchema = getMergedSchema();
            const parsed = parsePrismaSchema(mergedSchema);
            setParsedSchema(parsed);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse schema");
            setParsedSchema(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Parse schema when any file content changes (debounced)
    useEffect(() => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        if (isUpdatingFromDiagramRef.current) {
            return;
        }

        updateTimeoutRef.current = setTimeout(() => {
            try {
                const mergedSchema = getMergedSchema();
                const parsed = parsePrismaSchema(mergedSchema);
                setParsedSchema(parsed);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to parse schema");
                setParsedSchema(null);
            }
        }, 500);

        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schemaFiles, getMergedSchema, setParsedSchema, setError]);

    // Auto-save every 5 seconds
    useEffect(() => {
        autoSaveIntervalRef.current = setInterval(() => {
            saveSchema();
        }, 5000); // 5 seconds

        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current);
            }
        };
    }, [saveSchema]);

    // Manual save handler
    const handleSave = useCallback(() => {
        setIsSaving(true);
        saveSchema();
        lastSaveRef.current = Date.now();
        setTimeout(() => {
            setIsSaving(false);
        }, 1000);
    }, [saveSchema]);

    // Keyboard shortcut: Ctrl+S or Cmd+S to save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleSave]);

    const handleEditorChange = (value: string | undefined) => {
        if (isUpdatingFromDiagramRef.current || !activeFileId) return;
        updateSchemaFile(activeFileId, value || "");
    };

    const handleDiagramNodesChange = (nodes: Node[]) => {
        if (isUpdatingFromDiagramRef.current) return;
        // Diagram nodes changed - could regenerate schema if needed
        // For now, we'll keep it simple and only sync from editor to diagram
    };

    const handleDiagramEdgesChange = (edges: Edge[]) => {
        if (isUpdatingFromDiagramRef.current) return;
        // Diagram edges changed - could regenerate schema if needed
    };

    // Configure Monaco editor
    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;

        // Register Prisma language
        monaco.languages.register({ id: "prisma" });

        // Define Prisma tokens
        monaco.languages.setMonarchTokensProvider("prisma", {
            tokenizer: {
                root: [
                    [/model|enum|datasource|generator/, "keyword"],
                    [/@\w+/, "annotation"],
                    [/[a-z_$][\w$]*/, "identifier"],
                    [/[A-Z][\w]*/, "type.identifier"],
                    [/"[^"]*"/, "string"],
                    [/\/\/.*$/, "comment"],
                    [/\d+/, "number"],
                    [/[{}[\]]/, "delimiter"],
                    [/[:=]/, "operator"],
                ],
            },
        });

        // Set editor options
        editor.updateOptions({
            minimap: { enabled: false },
            fontSize: 14,
            tabSize: 2,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            readOnly: false,
            quickSuggestions: true,
            acceptSuggestionOnEnter: "on",
            formatOnPaste: true,
            formatOnType: true,
            contextmenu: true,
        });

        // Ensure editor can receive keyboard input
        editor.focus();

        // Ensure editor can handle its own keyboard shortcuts
        // Only prevent space key from being captured by ReactFlow when editor is focused
        const editorContainer = editor.getContainerDomNode();
        if (editorContainer) {
            // Handle space key on the textarea - stop propagation in bubbling phase
            // This allows Monaco to process it first, then prevents ReactFlow from panning
            const handleKeyDown = (e: KeyboardEvent) => {
                // Only handle space key when not combined with modifiers
                if (e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                    // Stop propagation to prevent ReactFlow panning
                    // Don't preventDefault - Monaco needs to process the space
                    e.stopPropagation();
                }
            };

            // Add listener to textarea in bubbling phase (after Monaco processes it)
            const monacoTextarea = editorContainer.querySelector("textarea");
            if (monacoTextarea) {
                monacoTextarea.addEventListener("keydown", handleKeyDown, false);
            }

            // Also add to container as a backup, but in bubbling phase
            editorContainer.addEventListener("keydown", (e: KeyboardEvent) => {
                if (e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                    const target = e.target as HTMLElement;
                    // Only stop if event is from Monaco editor
                    if (target.tagName === "TEXTAREA" || editorContainer.contains(target)) {
                        e.stopPropagation();
                    }
                }
            }, false);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden">
            {/* File Explorer */}
            <FileExplorer />

            {/* Resizable Editor and Canvas */}
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* Left Panel - Editor */}
                <ResizablePanel defaultSize={50} minSize={20}>
                    <div className="h-full flex flex-col border-r border-zinc-300 dark:border-zinc-700">
                        <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 px-4 py-4 flex items-center justify-between min-h-[65px]">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Prisma Schema
                                </h2>
                                {activeFile && (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {activeFile.name}
                                    </span>
                                )}
                            </div>
                            {error && (
                                <div className="text-xs text-red-600 dark:text-red-400 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded">
                                    {error}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 relative">
                            <Editor
                                key={activeFileId} // Force re-render when file changes
                                height="100%"
                                defaultLanguage="prisma"
                                language="prisma"
                                value={activeContent}
                                onChange={handleEditorChange}
                                onMount={handleEditorDidMount}
                                theme="vs-dark"
                                options={{
                                    readOnly: false,
                                    domReadOnly: false,
                                    quickSuggestions: true,
                                    acceptSuggestionOnEnter: "on",
                                    formatOnPaste: true,
                                    formatOnType: true,
                                    contextmenu: true,
                                }}
                                loading={
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-zinc-500">Loading editor...</div>
                                    </div>
                                }
                            />
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel - Diagram */}
                <ResizablePanel defaultSize={50} minSize={20}>
                    <div className="h-full flex flex-col">
                        <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 px-4 py-4 flex items-center justify-between min-h-[65px]">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Database Diagram
                            </h2>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="h-8 w-8"
                                    title="Save schema (Ctrl+S)"
                                >
                                    <Save className={`h-4 w-4 ${isSaving ? "animate-spin" : ""}`} />
                                </Button>
                                <ModeToggle />
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            <DiagramCanvas
                                schema={parsedSchema}
                                schemaContent={useMemo(() => {
                                    // Pass only the main file content, not the merged schema
                                    // because addRelationToSchema needs to work on a single file
                                    const mainFile = schemaFiles.find((f) => f.isMain);
                                    const content = mainFile?.content || getMergedSchema();
                                    return content;
                                }, [schemaFiles])}
                                onNodesChange={handleDiagramNodesChange}
                                onEdgesChange={handleDiagramEdgesChange}
                                readonly={false}
                                onSchemaUpdate={(updatedSchema) => {
                                    // Update the main schema file with the new relation
                                    const mainFile = schemaFiles.find((f) => f.isMain);

                                    if (mainFile) {
                                        // updatedSchema should already be just the main file content
                                        // since we're now passing only main file content to DiagramCanvas

                                        // Prevent editor from triggering parse while we update
                                        isUpdatingFromDiagramRef.current = true;

                                        // Update the schema file in the store
                                        updateSchemaFile(mainFile.name, updatedSchema);

                                        // Update the editor if it's currently showing the main file
                                        if (editorRef.current && activeFileId === mainFile.name) {
                                            editorRef.current.setValue(updatedSchema);
                                        }

                                        // Get merged schema and re-parse
                                        const mergedSchema = getMergedSchema();
                                        try {
                                            const parsed = parsePrismaSchema(mergedSchema);
                                            setParsedSchema(parsed);
                                            setError(null);
                                        } catch (err) {
                                            setError(err instanceof Error ? err.message : "Failed to parse schema");
                                        }

                                        // Reset flag after a delay to allow parse to complete
                                        setTimeout(() => {
                                            isUpdatingFromDiagramRef.current = false;
                                        }, 200);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}

