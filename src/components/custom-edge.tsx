"use client";

import { useMemo } from "react";
import { BaseEdge, EdgeProps, getBezierPath, Position } from "reactflow";

export function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    data,
    label,
}: EdgeProps) {
    const [edgePath, labelX, labelY] = useMemo(() => {
        const dynamicSourcePosition =
            sourceX > targetX ? Position.Left : Position.Right;
        const dynamicTargetPosition =
            targetX < sourceX ? Position.Right : Position.Left;

        return getBezierPath({
            sourceX,
            sourceY,
            sourcePosition: dynamicSourcePosition,
            targetX,
            targetY,
            targetPosition: dynamicTargetPosition,
        });
    }, [sourceX, sourceY, targetX, targetY]);

    const relationType = data?.relationType || "1-1";
    const sourceField = data?.sourceField || "";
    const targetField = data?.targetField || "";
    const isManyToMany = relationType === "M-M";

    // Get color based on relation type
    const getRelationColor = () => {
        switch (relationType) {
            case "1-1":
                return "#3b82f6"; // Blue
            case "1-M":
                return "#10b981"; // Green
            case "M-M":
                return "#f59e0b"; // Orange
            default:
                return "#64748b";
        }
    };

    // Get relation type badge
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

    // Create bidirectional marker for many-to-many
    const getMarkerStart = () => {
        if (isManyToMany) {
            // Create a marker that points back to source
            return `url(#react-flow__arrowclosed-backward-${id})`;
        }
        return undefined;
    };

    const color = getRelationColor();
    const sourceFieldName = sourceField.split(".")[1] || "";
    const targetFieldName = targetField.split(".")[1] || "";

    return (
        <>
            {/* Define marker for bidirectional arrow (only for M-M) */}
            {isManyToMany && (
                <defs>
                    <marker
                        id={`react-flow__arrowclosed-backward-${id}`}
                        markerWidth={12}
                        markerHeight={12}
                        viewBox="0 0 12 12"
                        refX={12}
                        refY={6}
                        orient="auto"
                    >
                        <path
                            d="M0,0 L0,12 L12,6 z"
                            fill={color}
                        />
                    </marker>
                </defs>
            )}
            {isManyToMany ? (
                // Render path directly for M-M to support bidirectional arrows
                <path
                    id={id}
                    d={edgePath}
                    markerEnd={markerEnd}
                    markerStart={getMarkerStart()}
                    style={{
                        ...style,
                        stroke: color,
                        strokeWidth: 2,
                        fill: "none",
                    }}
                />
            ) : (
                <BaseEdge
                    id={id}
                    path={edgePath}
                    markerEnd={markerEnd}
                    style={{
                        ...style,
                        stroke: color,
                        strokeWidth: 2,
                    }}
                />
            )}
            <g>
                {/* Background for label */}
                <rect
                    x={labelX - 60}
                    y={labelY - 20}
                    width={120}
                    height={40}
                    fill="white"
                    fillOpacity={0.9}
                    rx={4}
                    stroke={color}
                    strokeWidth={1}
                />
                {/* Relation type badge */}
                <rect
                    x={labelX - 55}
                    y={labelY - 15}
                    width={30}
                    height={18}
                    fill={color}
                    rx={3}
                />
                <text
                    x={labelX - 40}
                    y={labelY - 3}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10px"
                    fontWeight="bold"
                >
                    {getRelationBadge()}
                </text>
                {/* Field connection label */}
                <text
                    x={labelX}
                    y={labelY + 8}
                    textAnchor="middle"
                    fill="#1e293b"
                    fontSize="9px"
                    fontWeight="500"
                >
                    {isManyToMany
                        ? `${sourceFieldName} ↔ ${targetFieldName}`
                        : `${sourceFieldName} → ${targetFieldName}`}
                </text>
            </g>
        </>
    );
}

