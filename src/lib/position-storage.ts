import type { Node } from "reactflow";

export interface NodePosition {
    x: number;
    y: number;
}

const STORAGE_KEY = "prisma-diagram-positions";

/**
 * Save node positions to localStorage
 */
export function saveNodePositions(nodes: Node[]): void {
    if (typeof window === "undefined") return;

    try {
        const positions: Record<string, NodePosition> = {};
        nodes.forEach((node) => {
            positions[node.id] = {
                x: node.position.x,
                y: node.position.y,
            };
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch (error) {
        console.error("Failed to save node positions:", error);
    }
}

/**
 * Load node positions from localStorage
 */
export function loadNodePositions(): Record<string, NodePosition> | null {
    if (typeof window === "undefined") return null;

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved) as Record<string, NodePosition>;
        }
    } catch (error) {
        console.error("Failed to load node positions:", error);
    }

    return null;
}

/**
 * Get position for a specific node, or return null if not found
 */
export function getNodePosition(nodeId: string): NodePosition | null {
    const positions = loadNodePositions();
    return positions?.[nodeId] || null;
}

/**
 * Clean up positions for nodes that no longer exist
 */
export function cleanupNodePositions(existingNodeIds: string[]): void {
    if (typeof window === "undefined") return;

    try {
        const positions = loadNodePositions();
        if (!positions) return;

        const nodeIdSet = new Set(existingNodeIds);
        const cleanedPositions: Record<string, NodePosition> = {};

        // Only keep positions for nodes that still exist
        Object.keys(positions).forEach((nodeId) => {
            if (nodeIdSet.has(nodeId)) {
                cleanedPositions[nodeId] = positions[nodeId];
            }
        });

        // Save cleaned positions
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedPositions));
    } catch (error) {
        console.error("Failed to cleanup node positions:", error);
    }
}

