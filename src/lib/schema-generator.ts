import type { Node, Edge } from "reactflow";
import type { ParsedPrismaSchema, PrismaModel, PrismaField } from "@/types/prisma";

export interface DiagramNodeData {
    modelName: string;
    fields: Array<{
        name: string;
        type: string;
        isOptional: boolean;
        isList: boolean;
        isId?: boolean;
        isUnique?: boolean;
        relationName?: string;
    }>;
}

export function generatePrismaSchema(
    nodes: Node<DiagramNodeData>[],
    edges: Edge[],
    datasource?: ParsedPrismaSchema["datasource"],
    generator?: ParsedPrismaSchema["generator"]
): string {
    const lines: string[] = [];

    // Add datasource
    if (datasource) {
        lines.push(`datasource db {`);
        lines.push(`  provider = "${datasource.provider}"`);
        if (datasource.url) {
            lines.push(`  url      = env("DATABASE_URL")`);
        }
        lines.push(`}`);
        lines.push("");
    }

    // Add generator
    if (generator) {
        lines.push(`generator client {`);
        lines.push(`  provider = "${generator.provider}"`);
        if (generator.output) {
            lines.push(`  output   = "${generator.output}"`);
        }
        lines.push(`}`);
        lines.push("");
    }

    // Generate models from nodes
    for (const node of nodes) {
        const data = node.data;
        if (!data || !data.modelName) continue;

        lines.push(`model ${data.modelName} {`);

        // Add fields
        for (const field of data.fields || []) {
            let fieldLine = `  ${field.name} `;

            // Add type with optional list modifier
            if (field.isList) {
                fieldLine += `${field.type}[]`;
            } else {
                fieldLine += field.type;
            }

            // Add optional modifier
            if (field.isOptional) {
                fieldLine += "?";
            }

            // Add attributes
            const attrs: string[] = [];
            if (field.isId) {
                attrs.push("@id");
            }
            if (field.isUnique) {
                attrs.push("@unique");
            }

            // Handle relations - only add @relation if explicitly defined in the schema
            // Don't auto-add @relation for implicit many-to-many relationships
            if (field.relationName) {
                // Field has an explicit relation name from the parsed schema
                attrs.push(`@relation("${field.relationName}")`);
            } else {
                // Check for relations from edges (for explicit relations with foreign keys)
                const relationEdge = edges.find(
                    (e) =>
                        (e.source === node.id && e.targetHandle === field.name) ||
                        (e.target === node.id && e.sourceHandle === field.name)
                );

                if (relationEdge) {
                    const targetNode = nodes.find((n) => n.id === relationEdge.target || n.id === relationEdge.source);
                    if (targetNode && targetNode.data) {
                        // Only add @relation if it's an explicit relation (has foreign key)
                        // For implicit M-M, we don't add @relation but still show the edge in diagram
                        const edgeData = relationEdge.data;
                        if (edgeData?.relationType !== "M-M") {
                            const relationName = `rel_${data.modelName}_${targetNode.data.modelName}`;
                            attrs.push(`@relation(name: "${relationName}")`);
                        }
                    }
                }
            }

            if (attrs.length > 0) {
                fieldLine += ` ${attrs.join(" ")}`;
            }

            lines.push(fieldLine);
        }

        lines.push(`}`);
        lines.push("");
    }

    return lines.join("\n");
}

export function convertSchemaToNodesAndEdges(
    schema: ParsedPrismaSchema,
    savedPositions?: Record<string, { x: number; y: number }> | null
): { nodes: Node<DiagramNodeData>[]; edges: Edge[] } {
    const nodes: Node<DiagramNodeData>[] = [];
    const edges: Edge[] = [];

    // Create nodes for each model
    schema.models.forEach((model, index) => {
        const nodeData: DiagramNodeData = {
            modelName: model.name,
            fields: model.fields.map((field) => ({
                name: field.name,
                type: field.type,
                isOptional: field.isOptional,
                isList: field.isList,
                isId: field.attributes?.some((attr) => attr.includes("@id")) || false,
                isUnique: field.attributes?.some((attr) => attr.includes("@unique")) || false,
                relationName: field.relation?.name, // Only use explicit relation names from schema
            })),
        };

        // Use saved position if available, otherwise use default layout
        const savedPosition = savedPositions?.[model.name];
        const defaultPosition = { x: index * 300, y: 0 };

        nodes.push({
            id: model.name,
            type: "modelNode",
            position: savedPosition || defaultPosition,
            data: nodeData,
            draggable: true,
        });

        // Create edges for relations
        // Track edges we've already created to avoid duplicates
        const createdEdges = new Set<string>();

        model.fields.forEach((field) => {
            // Skip if field is not a relation type (not a model name)
            const isRelationField = schema.models.some((m) => m.name === field.type);
            if (!isRelationField || !field.relation) return;

            const targetModelName = field.type;
            const targetModel = schema.models.find((m) => m.name === targetModelName);

            if (!targetModel) return;

            // Find the target field that references back to this model
            // This is the inverse side of the relation (e.g., User.posts when processing Post.author)
            const targetField = targetModel.fields.find((f) => {
                // Target field should be of type that matches source model name
                if (f.type === model.name && f.relation !== undefined) {
                    // Match by relation name if both have it
                    if (field.relation?.name && f.relation?.name) {
                        return field.relation.name === f.relation.name;
                    }
                    // If one has relation name and other doesn't, they don't match
                    if ((field.relation?.name && !f.relation?.name) || (!field.relation?.name && f.relation?.name)) {
                        return false;
                    }
                    // Otherwise, if types match and both are relations, they match
                    // (This handles implicit relations like User.posts Post[])
                    return true;
                }
                return false;
            });

            // Only create edge from the side that has the foreign key (references)
            const hasForeignKey = field.relation.references && field.relation.references.length > 0;
            const targetHasForeignKey = targetField?.relation?.references && targetField.relation.references.length > 0;

            // Determine relationship type based on array markers
            const sourceIsList = field.isList;
            const targetIsList = targetField?.isList || false;
            let relationType: "1-1" | "1-M" | "M-M";

            if (sourceIsList && targetIsList) {
                relationType = "M-M";
            } else if (sourceIsList || targetIsList) {
                relationType = "1-M";
            } else {
                relationType = "1-1";
            }

            // Create edge in two cases:
            // 1. Explicit relation with foreign key (one side has FK)
            // 2. Implicit many-to-many (both sides are lists, no FK on either side)
            const isExplicitRelation = hasForeignKey && !targetHasForeignKey;
            const isImplicitManyToMany = sourceIsList && targetIsList && !hasForeignKey && !targetHasForeignKey;

            if (isExplicitRelation || isImplicitManyToMany) {
                // For many-to-many, create a canonical edge ID that doesn't depend on processing order
                // Sort model names alphabetically to ensure we only create one edge
                let edgeId: string;
                let reverseEdgeId: string;
                let shouldCreateEdge = false;

                if (isImplicitManyToMany) {
                    // For M-M, use sorted model names to create a canonical ID
                    const [model1, model2] = [model.name, targetModelName].sort();
                    edgeId = `${model1}-${model2}-M-M`;
                    reverseEdgeId = `${model2}-${model1}-M-M`;
                    // Only create edge if we're processing from the alphabetically first model
                    // This ensures we only create one edge for M-M relationships
                    shouldCreateEdge = model.name === model1 && !createdEdges.has(edgeId) && !createdEdges.has(reverseEdgeId);
                } else {
                    // For explicit relations, use the original logic
                    edgeId = `${model.name}-${targetModelName}-${field.name}`;
                    reverseEdgeId = `${targetModelName}-${model.name}-${targetField?.name || ""}`;
                    shouldCreateEdge = !createdEdges.has(edgeId) && !createdEdges.has(reverseEdgeId);
                }

                if (shouldCreateEdge) {
                    // Add both IDs to prevent duplicates from either direction
                    createdEdges.add(edgeId);
                    if (edgeId !== reverseEdgeId) {
                        createdEdges.add(reverseEdgeId);
                    }

                    // For M-M relationships, we need to find fields from both models
                    let actualSource: string;
                    let actualTarget: string;
                    let actualSourceField: string;
                    let actualTargetField: string;
                    let actualSourceHandle: string;
                    let actualTargetHandle: string;

                    if (isImplicitManyToMany) {
                        // For implicit M-M, connect from id to id
                        // Use canonical order (alphabetically sorted) for consistency
                        const [model1, model2] = [model.name, targetModelName].sort();
                        actualSource = model1;
                        actualTarget = model2;

                        // Connect from id to id for implicit many-to-many
                        actualSourceField = "id";
                        actualTargetField = "id";
                        actualSourceHandle = "id-right";
                        actualTargetHandle = "id-left";
                    } else {
                        // For explicit relations, use the original logic
                        actualSource = model.name;
                        actualTarget = targetModelName;
                        actualSourceField = hasForeignKey
                            ? (field.relation.fields?.[0] || field.name)
                            : field.name;
                        actualTargetField = hasForeignKey
                            ? (field.relation.references?.[0] || "id")
                            : (targetField?.name || "id");
                        const sourceFieldName = hasForeignKey
                            ? (field.relation.fields?.[0] || field.name)
                            : field.name;
                        const targetFieldName = hasForeignKey
                            ? (field.relation.references?.[0] || "id")
                            : (targetField?.name || "id");
                        actualSourceHandle = `${sourceFieldName}-right`;
                        actualTargetHandle = `${targetFieldName}-left`;
                    }

                    // Create label with appropriate arrow direction
                    const arrowSymbol = relationType === "M-M" ? " ↔ " : " → ";
                    const edgeLabel = `${actualSource}.${actualSourceField}${arrowSymbol}${actualTarget}.${actualTargetField}`;

                    edges.push({
                        id: edgeId,
                        source: actualSource,
                        target: actualTarget,
                        sourceHandle: actualSourceHandle,
                        targetHandle: actualTargetHandle,
                        type: "smoothstep",
                        animated: false,
                        label: edgeLabel,
                        labelStyle: {
                            fill: "#64748b",
                            fontWeight: 600,
                            fontSize: "11px",
                        },
                        labelBgStyle: {
                            fill: "#ffffff",
                            fillOpacity: 0.8,
                        },
                        style: {
                            strokeWidth: 2,
                            stroke:
                                relationType === "1-1"
                                    ? "#3b82f6"
                                    : relationType === "1-M"
                                        ? "#10b981"
                                        : "#f59e0b",
                        },
                        data: {
                            relationType,
                            sourceField: `${actualSource}.${actualSourceField}`,
                            targetField: `${actualTarget}.${actualTargetField}`,
                        },
                    });
                }
            }
        });
    });

    return { nodes, edges };
}

