"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    Connection,
    useNodesState,
    useEdgesState,
    addEdge,
    Panel,
    EdgeTypes,
    Handle,
    Position,
} from "reactflow";
import "reactflow/dist/style.css";
import type { ParsedPrismaSchema } from "@/types/prisma";
import { convertSchemaToNodesAndEdges, type DiagramNodeData } from "@/lib/schema-generator";
import dagre from "dagre";
import { CustomEdge } from "./custom-edge";

interface HistoryState {
    nodes: Node[];
    edges: Edge[];
}

// Custom node component for database tables
function ModelNode({ data }: { data: DiagramNodeData }) {
    const nodeRef = useRef<HTMLDivElement>(null);
    const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [fieldPositions, setFieldPositions] = useState<Record<string, number>>({});

    const updatePositions = useCallback(() => {
        if (!nodeRef.current) return;

        requestAnimationFrame(() => {
            if (!nodeRef.current) return;

            const positions: Record<string, number> = {};

            // Get the field container (the div with px-3) to get its offset from node
            const fieldContainer = nodeRef.current.querySelector('.px-3') as HTMLElement;
            const fieldContainerOffset = fieldContainer ? fieldContainer.offsetTop : 0;

            Object.entries(fieldRefs.current).forEach(([fieldName, fieldElement]) => {
                if (fieldElement && nodeRef.current) {
                    // Field's offsetTop is relative to its parent (fieldContainer with px-3)
                    // Add fieldContainer's offset to get position relative to node container
                    // offsetTop/offsetHeight are in local coordinates, unaffected by CSS transforms (zoom)
                    const fieldOffsetTop = fieldElement.offsetTop;
                    const fieldHeight = fieldElement.offsetHeight;

                    // Position relative to node container = container offset + field offset + center
                    positions[fieldName] = fieldContainerOffset + fieldOffsetTop + fieldHeight / 2;
                }
            });

            setFieldPositions(positions);
        });
    }, []);

    useEffect(() => {
        updatePositions();

        // Update when fields change
        const timeout1 = setTimeout(updatePositions, 10);
        const timeout2 = setTimeout(updatePositions, 100);

        // Update on window resize
        window.addEventListener("resize", updatePositions);
        return () => {
            clearTimeout(timeout1);
            clearTimeout(timeout2);
            window.removeEventListener("resize", updatePositions);
        };
    }, [data.fields, updatePositions]);

    return (
        <div
            ref={nodeRef}
            className="bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[200px] relative"
        >
            <div className="bg-blue-500 dark:bg-blue-600 text-white font-semibold px-4 py-2 rounded-t-lg">
                {data.modelName}
            </div>
            <div className="px-3 py-2">
                {data.fields.map((field, idx) => {
                    const handleTop = fieldPositions[field.name];

                    return (
                        <div
                            key={idx}
                            ref={(el) => {
                                if (el) {
                                    fieldRefs.current[field.name] = el;
                                    // Update positions after ref is set
                                    setTimeout(updatePositions, 0);
                                }
                            }}
                            data-field-name={field.name}
                            className="text-sm border-b border-zinc-200 dark:border-zinc-800 pb-2 pt-2 last:border-0 relative min-h-[50px] flex items-center"
                        >
                            {/* Left handle */}
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={field.name}
                                className="!absolute !w-3 !h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full z-10 pointer-events-auto"
                                style={{
                                    top: "50%", // Center relative to this row
                                    left: "-19px",
                                    transform: "translateY(-50%)",
                                }}
                            />

                            {/* Right handle */}
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={field.name}
                                className="!absolute !w-3 !h-3 bg-blue-500 border-2 border-white dark:border-zinc-900 rounded-full z-10 pointer-events-auto"
                                style={{
                                    top: "50%", // Center relative to this row
                                    right: "-19px",
                                    transform: "translateY(-50%)",
                                }}
                            />


                            <div className="flex-1 flex flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-xs">
                                        {field.name}
                                        {field.isOptional ? "?" : ""}
                                    </span>
                                    <div className="flex gap-1">
                                        {field.isId && (
                                            <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                                                PK
                                            </span>
                                        )}
                                        {field.isUnique && !field.isId && (
                                            <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded">
                                                UQ
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {field.type}
                                    {field.isList ? "[]" : ""}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const nodeTypes = {
    modelNode: ModelNode,
};

const edgeTypes: EdgeTypes = {
    smoothstep: CustomEdge,
};

// Auto-layout function using dagre
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 100 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 250, height: 100 + (node.data?.fields?.length || 0) * 50 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            draggable: true,
            position: {
                x: nodeWithPosition.x - 125,
                y: nodeWithPosition.y - 50,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
}

interface DiagramCanvasProps {
    schema: ParsedPrismaSchema | null;
    onNodesChange?: (nodes: Node[]) => void;
    onEdgesChange?: (edges: Edge[]) => void;
    readonly?: boolean;
}

export function DiagramCanvas({
    schema,
    onNodesChange: externalOnNodesChange,
    onEdgesChange: externalOnEdgesChange,
    readonly = false,
}: DiagramCanvasProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const historyRef = useRef<{
        pushToHistory: (nodes: Node[], edges: Edge[]) => void;
        undo: () => HistoryState | null;
        redo: () => HistoryState | null;
        history: HistoryState[];
        historyIndex: number;
    } | null>(null);
    const lastSaveRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize history system
    useEffect(() => {
        if (!historyRef.current) {
            const history: HistoryState[] = [];
            let historyIndex = -1;

            const pushToHistory = (newNodes: Node[], newEdges: Edge[]) => {
                const newState = { nodes: [...newNodes], edges: [...newEdges] };
                // Remove any states after current index
                const trimmedHistory = history.slice(0, historyIndex + 1);
                trimmedHistory.push(newState);

                // Limit history size to 50 states
                if (trimmedHistory.length > 50) {
                    trimmedHistory.shift();
                    historyIndex = trimmedHistory.length - 1;
                } else {
                    historyIndex = trimmedHistory.length - 1;
                }

                history.length = 0;
                history.push(...trimmedHistory);
            };

            const undo = (): HistoryState | null => {
                if (historyIndex > 0) {
                    historyIndex--;
                    return history[historyIndex];
                }
                return null;
            };

            const redo = (): HistoryState | null => {
                if (historyIndex < history.length - 1) {
                    historyIndex++;
                    return history[historyIndex];
                }
                return null;
            };

            historyRef.current = {
                pushToHistory,
                undo,
                redo,
                get history() {
                    return history;
                },
                get historyIndex() {
                    return historyIndex;
                },
            };
        }
    }, []);

    // Debounced save to history
    const saveToHistory = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            if (historyRef.current && nodes.length > 0) {
                const currentState = JSON.stringify({ nodes, edges });
                const lastSave = lastSaveRef.current
                    ? JSON.stringify(lastSaveRef.current)
                    : "";

                // Only save if state has changed
                if (currentState !== lastSave) {
                    historyRef.current.pushToHistory(nodes, edges);
                    lastSaveRef.current = { nodes: [...nodes], edges: [...edges] };
                }
            }
        }, 300);
    }, [nodes, edges]);

    // Update diagram when schema changes
    useEffect(() => {
        if (schema && schema.models.length > 0) {
            try {
                const { nodes: newNodes, edges: newEdges } = convertSchemaToNodesAndEdges(schema);
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
                lastSaveRef.current = { nodes: [...layoutedNodes], edges: [...layoutedEdges] };

                // Initialize history with new nodes
                if (historyRef.current) {
                    historyRef.current.pushToHistory(layoutedNodes, layoutedEdges);
                }

                // Notify parent of changes
                if (externalOnNodesChange) {
                    externalOnNodesChange(layoutedNodes);
                }
                if (externalOnEdgesChange) {
                    externalOnEdgesChange(layoutedEdges);
                }
            } catch (error) {
                console.error("Error rendering diagram:", error);
                setNodes([]);
                setEdges([]);
                lastSaveRef.current = null;
            }
        } else {
            setNodes([]);
            setEdges([]);
            lastSaveRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema]);

    // Save to history when nodes or edges change (debounced)
    useEffect(() => {
        if (nodes.length > 0 && !readonly) {
            saveToHistory();
        }
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [nodes, edges, readonly, saveToHistory]);

    const onConnect = useCallback(
        (params: Connection) => {
            if (readonly) return;
            const newEdges = addEdge(params, edges);
            setEdges(newEdges);
            if (externalOnEdgesChange) {
                externalOnEdgesChange(newEdges);
            }
            // Save to history immediately when connection is made
            if (historyRef.current) {
                historyRef.current.pushToHistory(nodes, newEdges);
                lastSaveRef.current = { nodes: [...nodes], edges: [...newEdges] };
            }
        },
        [edges, nodes, readonly, setEdges, externalOnEdgesChange]
    );

    // Handle undo/redo for diagram only (not editor)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't interfere with Monaco editor - let it handle its own undo/redo
            const target = e.target as HTMLElement;
            // Check if the event is coming from Monaco editor or its textarea
            if (target.closest(".monaco-editor") ||
                target.closest(".monaco-editor-textarea") ||
                target.closest("[role='textbox']") ||
                target.tagName === "TEXTAREA" ||
                target.closest("textarea")) {
                return; // Let Monaco editor handle undo/redo for itself
            }

            // Also check if focus is on the editor
            const activeElement = document.activeElement;
            if (activeElement && (
                activeElement.closest(".monaco-editor") ||
                activeElement.tagName === "TEXTAREA"
            )) {
                return;
            }

            // Ctrl+Z for undo, Ctrl+Shift+Z or Ctrl+Y for redo
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
                e.preventDefault();
                if (historyRef.current && !readonly) {
                    const state = historyRef.current.undo();
                    if (state) {
                        setNodes(state.nodes);
                        setEdges(state.edges);
                        lastSaveRef.current = { nodes: [...state.nodes], edges: [...state.edges] };
                        if (externalOnNodesChange) {
                            externalOnNodesChange(state.nodes);
                        }
                        if (externalOnEdgesChange) {
                            externalOnEdgesChange(state.edges);
                        }
                    }
                }
            } else if (
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
                ((e.ctrlKey || e.metaKey) && e.key === "y")
            ) {
                e.preventDefault();
                if (historyRef.current && !readonly) {
                    const state = historyRef.current.redo();
                    if (state) {
                        setNodes(state.nodes);
                        setEdges(state.edges);
                        lastSaveRef.current = { nodes: [...state.nodes], edges: [...state.edges] };
                        if (externalOnNodesChange) {
                            externalOnNodesChange(state.nodes);
                        }
                        if (externalOnEdgesChange) {
                            externalOnEdgesChange(state.edges);
                        }
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [readonly, setNodes, setEdges, externalOnNodesChange, externalOnEdgesChange]);

    if (!schema || schema.models.length === 0) {
        return (
            <div className="w-full h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                        No schema loaded. Start typing a Prisma schema in the editor.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-zinc-50 dark:bg-zinc-950">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={(changes) => {
                    if (!readonly) {
                        onEdgesChange(changes);
                        if (externalOnEdgesChange) {
                            externalOnEdgesChange(edges);
                        }
                    }
                }}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                attributionPosition="bottom-left"
            >
                <Background />
                <Controls />
                <MiniMap />
                <Panel position="top-right" className="bg-white dark:bg-zinc-900 p-2 rounded shadow">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        {nodes.length} model{nodes.length !== 1 ? "s" : ""}
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}

