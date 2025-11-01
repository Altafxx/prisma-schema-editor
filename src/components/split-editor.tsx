"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { DiagramCanvas } from "./diagram-canvas";
import { FileExplorer } from "./file-explorer";
import { parsePrismaSchema } from "@/lib/prisma-parser";
import { useSchemaStore } from "@/store/schema-store";
import type { Node, Edge } from "reactflow";

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
    } = useSchemaStore();

    const activeFile = schemaFiles.find((f) => f.name === activeFileId) || schemaFiles[0];
    const activeContent = activeFile?.content || "";

    const editorRef = useRef<any>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isUpdatingFromDiagramRef = useRef(false);

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

            {/* Left Panel - Editor */}
            <div className="flex-1 border-r border-zinc-300 dark:border-zinc-700 flex flex-col">
                <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 px-4 py-2 flex items-center justify-between">
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

            {/* Right Panel - Diagram */}
            <div className="w-1/2 flex flex-col">
                <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 px-4 py-2">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Database Diagram
                    </h2>
                </div>
                <div className="flex-1 relative">
                    <DiagramCanvas
                        schema={parsedSchema}
                        onNodesChange={handleDiagramNodesChange}
                        onEdgesChange={handleDiagramEdgesChange}
                        readonly={false}
                    />
                </div>
            </div>
        </div>
    );
}

