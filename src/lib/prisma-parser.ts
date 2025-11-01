import type { ParsedPrismaSchema, PrismaModel, PrismaField, PrismaEnum } from "@/types/prisma";

export function parsePrismaSchema(schema: string): ParsedPrismaSchema {
    const result: ParsedPrismaSchema = {
        models: [],
        enums: [],
    };

    // Remove comments, but preserve file separators for multi-file schemas
    // First remove multi-line comments
    let cleanSchema = schema.replace(/\/\*[\s\S]*?\*\//g, "");
    // Then remove single-line comments (but keep file separator comments)
    cleanSchema = cleanSchema.replace(/\/\/(?!\s*===).*$/gm, "");

    // Extract datasource
    const datasourceMatch = cleanSchema.match(/datasource\s+(\w+)\s*\{([^}]+)\}/);
    if (datasourceMatch) {
        const datasourceContent = datasourceMatch[2];
        const providerMatch = datasourceContent.match(/provider\s*=\s*"([^"]+)"/);
        const urlMatch = datasourceContent.match(/url\s*=\s*"([^"]+)"/);
        result.datasource = {
            provider: providerMatch?.[1] || "postgresql",
            url: urlMatch?.[1],
        };
    }

    // Extract generator
    const generatorMatch = cleanSchema.match(/generator\s+(\w+)\s*\{([^}]+)\}/);
    if (generatorMatch) {
        const generatorContent = generatorMatch[2];
        const providerMatch = generatorContent.match(/provider\s*=\s*"([^"]+)"/);
        const outputMatch = generatorContent.match(/output\s*=\s*"([^"]+)"/);
        result.generator = {
            provider: providerMatch?.[1] || "prisma-client-js",
            output: outputMatch?.[1],
        };
    }

    // Extract models - handle nested braces properly
    const modelRegex = /model\s+(\w+)\s*\{/g;
    let modelMatch;
    while ((modelMatch = modelRegex.exec(cleanSchema)) !== null) {
        const startPos = modelMatch.index + modelMatch[0].length;
        const modelName = modelMatch[1];

        // Find matching closing brace
        let braceCount = 1;
        let pos = startPos;
        let endPos = startPos;

        while (pos < cleanSchema.length && braceCount > 0) {
            if (cleanSchema[pos] === '{') braceCount++;
            if (cleanSchema[pos] === '}') braceCount--;
            if (braceCount === 0) {
                endPos = pos;
                break;
            }
            pos++;
        }

        const modelBody = cleanSchema.substring(startPos, endPos);
        const fields = parseModelFields(modelBody);
        const attributes = extractAttributes(modelBody, "model");

        result.models.push({
            name: modelName,
            fields,
            attributes: attributes.length > 0 ? attributes : undefined,
        });
    }

    // Extract enums - handle nested braces properly
    const enumRegex = /enum\s+(\w+)\s*\{/g;
    let enumMatch;
    while ((enumMatch = enumRegex.exec(cleanSchema)) !== null) {
        const startPos = enumMatch.index + enumMatch[0].length;
        const enumName = enumMatch[1];

        // Find matching closing brace
        let braceCount = 1;
        let pos = startPos;
        let endPos = startPos;

        while (pos < cleanSchema.length && braceCount > 0) {
            if (cleanSchema[pos] === '{') braceCount++;
            if (cleanSchema[pos] === '}') braceCount--;
            if (braceCount === 0) {
                endPos = pos;
                break;
            }
            pos++;
        }

        const enumBody = cleanSchema.substring(startPos, endPos);
        const values = enumBody
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith("//"))
            .map((line) => line.replace(/,/g, "").trim());

        result.enums.push({
            name: enumName,
            values,
        });
    }

    return result;
}

function parseModelFields(body: string): PrismaField[] {
    const fields: PrismaField[] = [];
    const lines = body.split("\n");

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@") || trimmed === "}") {
            continue;
        }

        // Match field definition: name type modifiers? attributes?
        // Examples: "id Int @id", "email String?", "posts Post[]", "author User @relation(...)"
        // Handle multi-line attributes by checking if line ends with attributes
        const fieldMatch = trimmed.match(/^(\w+)\s+([^\s@?]+?)(\??)(\s+.*)?$/);
        if (!fieldMatch) continue;

        const [, name, typePart, optionalMarker, rest] = fieldMatch;

        // Check for list (e.g., "String[]", "Post[]")
        const isList = typePart.endsWith("[]");
        const baseType = isList ? typePart.slice(0, -2) : typePart;

        // Check for optional (question mark after type)
        const isOptional = optionalMarker === "?" || typePart.includes("?");

        // Extract attributes
        const attributes = extractAttributes(rest, "field");
        const relationAttr = attributes.find((attr) => attr.startsWith("@relation"));

        let relation;
        // Check if this is a relation field (type is a model name)
        // If it has @relation attribute, parse it; otherwise it's an implicit relation
        if (relationAttr) {
            const relationMatch = relationAttr.match(/@relation\(([^)]*)\)/);
            if (relationMatch) {
                const relationContent = relationMatch[1];
                const nameMatch = relationContent.match(/name:\s*"([^"]+)"/);
                const fieldsMatch = relationContent.match(/fields:\s*\[([^\]]+)\]/);
                const referencesMatch = relationContent.match(/references:\s*\[([^\]]+)\]/);

                relation = {
                    name: nameMatch?.[1],
                    fields: fieldsMatch?.[1]?.split(",").map((f) => f.trim().replace(/"/g, "")),
                    references: referencesMatch?.[1]?.split(",").map((r) => r.trim().replace(/"/g, "")),
                };
            }
        } else if (isList || baseType.match(/^[A-Z]/)) {
            // Implicit relation - array type or capitalized type (likely a model)
            // Create empty relation object to mark it as a relation
            relation = {};
        }

        fields.push({
            name,
            type: baseType.trim(),
            isOptional,
            isList,
            attributes: attributes.length > 0 ? attributes : undefined,
            relation,
        });
    }

    return fields;
}

function extractAttributes(content: string, context: "model" | "field"): string[] {
    const attributes: string[] = [];
    const attrRegex = /@(\w+)(?:\(([^)]*)\))?/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(content)) !== null) {
        const attrName = attrMatch[1];
        const attrValue = attrMatch[2] || "";
        attributes.push(`@${attrName}${attrValue ? `(${attrValue})` : ""}`);
    }

    return attributes;
}

