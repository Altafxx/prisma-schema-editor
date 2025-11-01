import { useState, useCallback } from "react";
import type { Node, Edge } from "reactflow";

interface HistoryState {
    nodes: Node[];
    edges: Edge[];
}

export function useDiagramHistory(
    initialNodes: Node[],
    initialEdges: Edge[]
) {
    const [history, setHistory] = useState<HistoryState[]>([
        { nodes: initialNodes, edges: initialEdges },
    ]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const currentState = history[historyIndex];

    const pushToHistory = useCallback(
        (nodes: Node[], edges: Edge[]) => {
            const newState = { nodes: [...nodes], edges: [...edges] };

            // Remove any states after current index (when we're in the middle of history)
            const newHistory = history.slice(0, historyIndex + 1);

            // Add new state
            newHistory.push(newState);

            // Limit history size to 50 states
            if (newHistory.length > 50) {
                newHistory.shift();
                setHistoryIndex(newHistory.length - 1);
            } else {
                setHistoryIndex(newHistory.length - 1);
            }

            setHistory(newHistory);
        },
        [history, historyIndex]
    );

    const undo = useCallback((): HistoryState | null => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            return history[newIndex];
        }
        return null;
    }, [history, historyIndex]);

    const redo = useCallback((): HistoryState | null => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            return history[newIndex];
        }
        return null;
    }, [history, historyIndex]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    return {
        currentState,
        pushToHistory,
        undo,
        redo,
        canUndo,
        canRedo,
    };
}

