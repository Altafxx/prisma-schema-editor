import type { Node, Edge } from "reactflow";
import { getBezierPath, Position } from "reactflow";
import type { DiagramNodeData } from "./schema-generator";

/**
 * Export ReactFlow diagram to SVG
 */
export function exportDiagramToSVG(
    nodes: Node<DiagramNodeData>[],
    edges: Edge[],
    options?: {
        padding?: number;
        backgroundColor?: string;
        backgroundTheme?: "light" | "dark";
        nodeTheme?: "light" | "dark";
    }
): string {
    const padding = options?.padding ?? 50;

    // Determine background color from theme
    let backgroundColor: string;
    if (options?.backgroundTheme) {
        backgroundColor = options.backgroundTheme === "dark" ? "#09090b" : "#ffffff";
    } else if (options?.backgroundColor) {
        backgroundColor = options.backgroundColor;
    } else {
        backgroundColor = "#ffffff";
    }

    // Determine node theme - use explicit nodeTheme if provided, otherwise fallback to backgroundTheme
    let nodeTheme: "light" | "dark";
    if (options?.nodeTheme) {
        nodeTheme = options.nodeTheme;
    } else if (options?.backgroundTheme) {
        nodeTheme = options.backgroundTheme;
    } else {
        // Fallback: determine from background color
        nodeTheme = (backgroundColor === "#09090b" || backgroundColor === "#18181b" || backgroundColor === "#0a0a0a") ? "dark" : "light";
    }

    if (nodes.length === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
            <text x="200" y="100" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">No diagram to export</text>
        </svg>`;
    }

    // Calculate bounds
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
        const width = 250;
        const headerHeight = 40;
        const fieldRowHeight = 50;
        const fieldsContainerPadding = 8;
        const fields = node.data?.fields || [];
        const height = headerHeight + fieldsContainerPadding + fields.length * fieldRowHeight + fieldsContainerPadding;
        const x = node.position.x;
        const y = node.position.y;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
    });

    // Add padding
    const svgWidth = maxX - minX + padding * 2;
    const svgHeight = maxY - minY + padding * 2;
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    // Helper function to get relation color based on node theme
    const getRelationColorForTheme = (relationType: string, theme: "light" | "dark") => {
        // Base colors for relation types
        const baseColors = {
            "1-1": "#3b82f6", // Blue
            "1-M": "#10b981", // Green
            "M-M": "#f59e0b", // Orange
        };

        const baseColor = baseColors[relationType as keyof typeof baseColors] || "#64748b";

        // If nodes are dark, use slightly lighter/more vibrant colors for better contrast
        // If nodes are light, use the standard colors
        if (theme === "dark") {
            // Slightly adjust colors for dark nodes (make them a bit brighter)
            switch (relationType) {
                case "1-1":
                    return "#60a5fa"; // Lighter blue for dark nodes
                case "1-M":
                    return "#34d399"; // Lighter green for dark nodes
                case "M-M":
                    return "#fbbf24"; // Lighter orange for dark nodes
                default:
                    return "#94a3b8"; // Lighter grey
            }
        }
        return baseColor;
    };

    // Collect marker definitions for all edges (using nodeTheme for colors)
    const markerDefs: string[] = [];
    edges.forEach((edge) => {
        const relationType = edge.data?.relationType || "1-1";
        const strokeColor = edge.style?.stroke?.toString() || getRelationColorForTheme(relationType, nodeTheme);
        const isManyToMany = relationType === "M-M";
        const markerId = `arrowhead-${edge.id}`;
        const backwardMarkerId = `arrowhead-backward-${edge.id}`;

        markerDefs.push(`        <marker id="${markerId}" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="${strokeColor}" /></marker>`);
        if (isManyToMany) {
            markerDefs.push(`        <marker id="${backwardMarkerId}" markerWidth="12" markerHeight="12" viewBox="0 0 12 12" refX="12" refY="6" orient="auto"><path d="M0,0 L0,12 L12,6 z" fill="${strokeColor}" /></marker>`);
        }
    });

    // Start SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
    <rect width="100%" height="100%" fill="${backgroundColor}"/>
    <defs>
${markerDefs.join('\n')}
    </defs>
    <g transform="translate(${offsetX}, ${offsetY})">`;

    // Helper function to get handle position from handle ID
    const getHandlePosition = (node: Node<DiagramNodeData>, handleId: string, nodeWidth: number): { x: number; y: number; position: Position } => {
        const nodeData = node.data;
        if (!nodeData) {
            // Fallback to node center
            return {
                x: node.position.x + nodeWidth / 2,
                y: node.position.y + 50,
                position: Position.Top,
            };
        }

        // Extract field name from handle ID (e.g., "authorId-right" -> "authorId")
        const fieldName = handleId.replace(/-left$|-right$|-left-source$|-right-target$/, "");
        const field = nodeData.fields.find((f) => f.name === fieldName);

        if (!field) {
            // Fallback to node center
            return {
                x: node.position.x + nodeWidth / 2,
                y: node.position.y + 50,
                position: Position.Top,
            };
        }

        // Find field index to calculate Y position
        // Need to account for sorted fields (relation fields at bottom)
        const allFields = nodeData.fields;
        const sortedFields = [...allFields].sort((a, b) => {
            const aIsRelation = nodes.some(n => n.data?.modelName === a.type) || false;
            const bIsRelation = nodes.some(n => n.data?.modelName === b.type) || false;
            if (aIsRelation === bIsRelation) return 0;
            return aIsRelation ? 1 : -1; // Relations come after non-relations
        });
        const fieldIndex = sortedFields.findIndex((f) => f.name === fieldName);

        const headerHeight = 40;
        const fieldsContainerPadding = 8; // py-2 top padding
        const fieldRowHeight = 50; // min-h-[50px]
        // Calculate center Y of the field row (center of the 50px row)
        const fieldRowY = node.position.y + headerHeight + fieldsContainerPadding + fieldIndex * fieldRowHeight;
        const fieldY = fieldRowY + 25; // Center of the 50px field row (where the dot is)

        // Determine if handle is on left or right
        const isLeft = handleId.includes("-left");
        const x = isLeft ? node.position.x : node.position.x + nodeWidth;
        const position = isLeft ? Position.Left : Position.Right;

        return { x, y: fieldY, position };
    };

    // Draw edges first (so they appear behind nodes)
    edges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (!sourceNode || !targetNode) return;

        const sourceNodeWidth = 250;
        const targetNodeWidth = 250;

        // Get actual handle positions
        const sourceHandleId = edge.sourceHandle || "";
        const targetHandleId = edge.targetHandle || "";

        const sourcePos = getHandlePosition(sourceNode, sourceHandleId, sourceNodeWidth);
        const targetPos = getHandlePosition(targetNode, targetHandleId, targetNodeWidth);

        // Determine dynamic positions based on node positions (same logic as CustomEdge)
        const dynamicSourcePosition = sourcePos.x > targetPos.x ? Position.Left : Position.Right;
        const dynamicTargetPosition = targetPos.x < sourcePos.x ? Position.Right : Position.Left;

        // Use ReactFlow's getBezierPath to generate the same curved path as the canvas
        const [edgePath, labelX, labelY] = getBezierPath({
            sourceX: sourcePos.x,
            sourceY: sourcePos.y,
            sourcePosition: dynamicSourcePosition,
            targetX: targetPos.x,
            targetY: targetPos.y,
            targetPosition: dynamicTargetPosition,
        });

        // Get edge styling from edge data
        // Connector colors should adapt to node theme for better visibility
        const relationType = edge.data?.relationType || "1-1";
        const strokeColor = edge.style?.stroke?.toString() || getRelationColorForTheme(relationType, nodeTheme);
        const strokeWidth = edge.style?.strokeWidth?.toString() || "2";
        const isManyToMany = relationType === "M-M";

        // Create unique marker IDs for this edge (markers are defined in the top defs section)
        const markerId = `arrowhead-${edge.id}`;
        const backwardMarkerId = `arrowhead-backward-${edge.id}`;

        // Draw the edge path (no arrowheads - matching canvas)
        svg += `\n        <path d="${edgePath}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" />`;

        // Add edge label with styling matching the canvas
        if (edge.label || edge.data) {
            const sourceField = edge.data?.sourceField || "";
            const targetField = edge.data?.targetField || "";
            const sourceFieldName = sourceField.split(".")[1] || "";
            const targetFieldName = targetField.split(".")[1] || "";

            const getRelationBadge = () => {
                switch (relationType) {
                    case "1-1":
                        return "1:1";
                    case "1-M":
                        return "1:M";
                    case "M-M":
                        return "M:M";
                    default:
                        return "";
                }
            };

            // Label colors should match node theme, not background theme
            const labelBgColor = nodeTheme === "dark" ? "oklch(0.205 0 0)" : "white";
            const labelTextColor = nodeTheme === "dark" ? "oklch(0.985 0 0)" : "#1e293b";
            const labelBgOpacity = nodeTheme === "dark" ? 0.95 : 0.9;

            // Label background
            svg += `\n        <g>`;
            svg += `\n            <rect x="${labelX - 60}" y="${labelY - 20}" width="120" height="40" fill="${labelBgColor}" fill-opacity="${labelBgOpacity}" rx="4" stroke="${strokeColor}" stroke-width="1"/>`;

            // Relation type badge
            svg += `\n            <rect x="${labelX - 55}" y="${labelY - 15}" width="30" height="18" fill="${strokeColor}" rx="3"/>`;
            svg += `\n            <text x="${labelX - 40}" y="${labelY - 3}" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="white">${getRelationBadge()}</text>`;

            // Field connection label
            const connectionText = isManyToMany
                ? `${sourceFieldName} ↔ ${targetFieldName}`
                : `${sourceFieldName} → ${targetFieldName}`;
            svg += `\n            <text x="${labelX}" y="${labelY + 8}" text-anchor="middle" font-family="Arial" font-size="9" font-weight="500" fill="${labelTextColor}">${connectionText}</text>`;
            svg += `\n        </g>`;
        }
    });

    // Determine if dark mode based on node theme
    const isDark = nodeTheme === "dark";

    // Node styling colors based on theme
    const nodeBgColor = isDark ? "#18181b" : "#ffffff"; // zinc-900 or white
    const nodeBorderColor = isDark ? "#3f3f46" : "#d4d4d8"; // zinc-700 or zinc-300
    const headerBgColor = isDark ? "#2563eb" : "#3b82f6"; // blue-600 or blue-500
    const fieldBorderColor = isDark ? "#27272a" : "#e4e4e7"; // zinc-800 or zinc-200
    const fieldNameColor = isDark ? "#fafafa" : "#18181b"; // zinc-50 or zinc-950
    const fieldTypeColor = isDark ? "#a1a1aa" : "#71717a"; // zinc-400 or zinc-500

    // Badge colors for dark mode
    const badgeOptionalBg = isDark ? "#581c87" : "#f3e8ff"; // purple-900 or purple-100
    const badgeOptionalText = isDark ? "#e9d5ff" : "#6b21a8"; // purple-200 or purple-800
    const badgePkBg = isDark ? "#78350f" : "#fef3c7"; // yellow-900 or yellow-100
    const badgePkText = isDark ? "#fde047" : "#92400e"; // yellow-200 or yellow-800
    const badgeUqBg = isDark ? "#14532d" : "#dcfce7"; // green-900 or green-100
    const badgeUqText = isDark ? "#86efac" : "#166534"; // green-200 or green-800

    // Draw nodes
    nodes.forEach((node) => {
        const x = node.position.x;
        const y = node.position.y;
        const width = 250;
        const headerHeight = 40;
        const fieldRowHeight = 50; // min-h-[50px] per field
        const fields = node.data?.fields || [];
        const fieldsContainerPadding = 8; // py-2 = 8px top + 8px bottom
        const height = headerHeight + fieldsContainerPadding + fields.length * fieldRowHeight + fieldsContainerPadding;

        // Node container with shadow (using filter for shadow effect)
        svg += `\n        <g>`;
        // Shadow filter definition (reuse for all nodes)
        const shadowFilterId = `shadow-${isDark ? 'dark' : 'light'}`;

        // Node background with border (rounded-lg = 8px)
        svg += `\n            <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${nodeBgColor}" stroke="${nodeBorderColor}" stroke-width="2" rx="8" ry="8" filter="url(#${shadowFilterId})"/>`;

        // Header with rounded top corners only (rounded-t-lg) - using path for top-only rounding
        const headerRadius = 8;
        // Path: start at top-left (after radius), line to top-right (before radius), curve top-right corner, line down right, line across bottom, line up left, curve top-left corner, close
        svg += `\n            <path d="M ${x + headerRadius} ${y} L ${x + width - headerRadius} ${y} Q ${x + width} ${y} ${x + width} ${y + headerRadius} L ${x + width} ${y + headerHeight} L ${x} ${y + headerHeight} L ${x} ${y + headerRadius} Q ${x} ${y} ${x + headerRadius} ${y} Z" fill="${headerBgColor}"/>`;
        svg += `\n            <text x="${x + width / 2}" y="${y + 25}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="white">${node.data?.modelName || node.id}</text>`;

        // Fields container (px-3 py-2 equivalent = 12px horizontal, 8px vertical padding)
        const fieldContainerX = x + 12; // px-3
        const fieldContainerY = y + headerHeight + 8; // py-2 = 8px top padding

        const nodeData = node.data;

        // Sort fields: relation fields at the bottom (matching canvas behavior)
        const sortedFields = [...fields].sort((a, b) => {
            const aIsRelation = nodes.some(n => n.data?.modelName === a.type) || false;
            const bIsRelation = nodes.some(n => n.data?.modelName === b.type) || false;
            if (aIsRelation === bIsRelation) return 0;
            return aIsRelation ? 1 : -1; // Relations come after non-relations
        });

        sortedFields.forEach((field, idx) => {
            // Each field row: min-h-[50px] with pb-2 pt-2 (8px each)
            const fieldRowY = fieldContainerY + idx * 50; // 50px per field row
            const fieldContentY = fieldRowY + 8; // pt-2 = 8px top padding

            // Check if this is a relation field (type matches another model name)
            const isRelation = nodes.some(n => n.data?.modelName === field.type) || false;

            // Field row border (border-b, except last field)
            if (idx < sortedFields.length - 1) {
                const borderY = fieldRowY + 50; // Bottom of this field row
                svg += `\n            <line x1="${fieldContainerX}" y1="${borderY}" x2="${x + width - 12}" y2="${borderY}" stroke="${fieldBorderColor}" stroke-width="1"/>`;
            }

            // Field name (font-mono text-xs) - positioned at top of field content
            svg += `\n            <text x="${fieldContainerX}" y="${fieldContentY + 14}" font-family="ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace" font-size="12" fill="${fieldNameColor}">${field.name}</text>`;

            // Field type (text-xs text-zinc-500 dark:text-zinc-400) - positioned below name
            svg += `\n            <text x="${fieldContainerX}" y="${fieldContentY + 26}" font-family="Arial, sans-serif" font-size="12" fill="${fieldTypeColor}">${field.type}${field.isList ? "[]" : ""}</text>`;

            // Handle dots (only for non-relation fields) - w-3 h-3 = 12px, border-2 = 2px
            // Dots should be on the table edge with fill matching node background
            if (!isRelation) {
                const handleSize = 12; // w-3 h-3
                const handleBorder = 2; // border-2
                const handleRadius = handleSize / 2;
                // Position exactly on the table edge (not offset outside)
                // Center Y should be exactly at the middle of the field row (50px height)
                const handleCenterY = fieldRowY + 25; // Perfect center of 50px field row

                // Dots fill should match node background, outline color maintained
                const handleFillColor = nodeBgColor; // Same as node background
                const handleStrokeColor = isDark ? "#71717a" : "#a1a1aa"; // zinc-500 or zinc-400 (maintain current outline)

                // Left handle - circle on left edge with node background fill
                svg += `\n            <circle cx="${x}" cy="${handleCenterY}" r="${handleRadius}" fill="${handleFillColor}" stroke="${handleStrokeColor}" stroke-width="${handleBorder}"/>`;

                // Right handle - circle on right edge with node background fill
                svg += `\n            <circle cx="${x + width}" cy="${handleCenterY}" r="${handleRadius}" fill="${handleFillColor}" stroke="${handleStrokeColor}" stroke-width="${handleBorder}"/>`;
            }

            // Badges (matching exact Tailwind classes: px-1.5 py-0.5)
            let badgeX = x + width - 12; // Start from right edge minus padding
            const badgeWidth = 28; // Approximate width for px-1.5
            const badgeHeight = 16; // Approximate height for py-0.5
            const badgeY = fieldContentY + 2; // Align with field name
            const badgeGap = 4; // gap-1

            // Order: Optional, PK, UQ (matching the component order)
            if (field.isOptional) {
                svg += `\n            <rect x="${badgeX - badgeWidth}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" fill="${badgeOptionalBg}" rx="4"/>`;
                svg += `\n            <text x="${badgeX - badgeWidth / 2}" y="${badgeY + 11}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${badgeOptionalText}">?</text>`;
                badgeX -= badgeWidth + badgeGap;
            }
            if (field.isId) {
                svg += `\n            <rect x="${badgeX - badgeWidth}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" fill="${badgePkBg}" rx="4"/>`;
                svg += `\n            <text x="${badgeX - badgeWidth / 2}" y="${badgeY + 11}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${badgePkText}">PK</text>`;
                badgeX -= badgeWidth + badgeGap;
            }
            if (field.isUnique && !field.isId) {
                svg += `\n            <rect x="${badgeX - badgeWidth}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" fill="${badgeUqBg}" rx="4"/>`;
                svg += `\n            <text x="${badgeX - badgeWidth / 2}" y="${badgeY + 11}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${badgeUqText}">UQ</text>`;
                badgeX -= badgeWidth + badgeGap;
            }
        });

        svg += `\n        </g>`;
    });

    // Add shadow filter definition at the top of defs
    const shadowFilter = isDark
        ? `<filter id="shadow-dark" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="4"/><feOffset dx="0" dy="2" result="offsetblur"/><feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
        : `<filter id="shadow-light" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="4"/><feOffset dx="0" dy="2" result="offsetblur"/><feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

    // Insert shadow filter into defs
    const defsIndex = svg.indexOf('</defs>');
    if (defsIndex !== -1) {
        svg = svg.slice(0, defsIndex) + `\n        ${shadowFilter}` + svg.slice(defsIndex);
    }

    svg += `\n    </g>`;
    svg += `\n</svg>`;

    return svg;
}

