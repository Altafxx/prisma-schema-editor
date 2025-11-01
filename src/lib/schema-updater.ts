import type { RelationOptions } from "@/components/relation-dialog";

export interface ConnectionInfo {
    sourceModel: string;
    sourceField: string;
    targetModel: string;
    targetField: string;
}

/**
 * Pluralizes a word (simple implementation)
 */
function pluralize(word: string): string {
    if (word.endsWith('y')) {
        return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') || word.endsWith('ch') || word.endsWith('sh')) {
        return word + 'es';
    }
    return word + 's';
}

/**
 * Converts a model name to a field name (camelCase, plural for relations)
 */
function modelToFieldName(modelName: string, plural: boolean = false): string {
    const firstLower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    return plural ? pluralize(firstLower) : firstLower;
}

/**
 * Adds a relation to a Prisma schema based on the connection and relationship type
 */
export function addRelationToSchema(
    schemaContent: string,
    connection: ConnectionInfo,
    options: RelationOptions
): string {
    // Parse models from schema
    const models = extractModels(schemaContent);

    const { sourceModel, sourceField, targetModel, targetField } = connection;
    const { type: relationType, mode: relationMode } = options;

    let updatedSchema = schemaContent;

    // Generate relation field names based on model names (plural for relations)
    // For 1:M and M:M, use plural names for the list side
    const targetFieldNamePlural = modelToFieldName(targetModel, true); // e.g., "categories"
    const sourceFieldNamePlural = modelToFieldName(sourceModel, true); // e.g., "posts"
    const sourceFieldNameSingular = modelToFieldName(sourceModel, false); // e.g., "author"
    const targetFieldNameSingular = modelToFieldName(targetModel, false); // e.g., "category"

    // Foreign key names
    const sourceFkName = `${sourceFieldNameSingular}Id`; // e.g., "authorId"
    const targetFkName = `${targetFieldNameSingular}Id`; // e.g., "categoryId"

    // Generate relation name (combine both model names)
    const relationName = `${sourceModel}To${targetModel}`;
    // Generate junction model name based on order preference
    const junctionModelName = options.junctionOrder === "BonA"
        ? `${targetModel}On${sourceModel}`
        : `${sourceModel}On${targetModel}`; // e.g., "PostOnCategory" or "CategoryOnPost"

    if (relationType === "1-1") {
        // One-to-One: Determine which side has the foreign key
        // Check if sourceField already exists in source model and looks like a foreign key
        const sourceHasFk = fieldExistsInModel(updatedSchema, sourceModel, sourceField);
        const targetHasFk = fieldExistsInModel(updatedSchema, targetModel, targetFkName);

        // If sourceField exists in source model and ends with "Id" or is Int type, it's likely the FK
        const sourceFieldIsFk = sourceHasFk && (sourceField.endsWith("Id") || sourceField.endsWith("id"));

        console.log("1:1 Relation Debug:", {
            sourceModel,
            sourceField,
            targetModel,
            targetField,
            sourceHasFk,
            targetHasFk,
            sourceFieldIsFk,
            targetFieldNameSingular,
            sourceFieldNameSingular,
        });

        if (sourceFieldIsFk || (!targetHasFk && sourceField.endsWith("Id"))) {
            // Foreign key is on source model (e.g., Post.categoryId)
            // For 1:1 with FK on one side only, only add relation on the side with FK
            // No relation name needed (only needed when multiple relations exist between same models)
            // Target model doesn't get an inverse relation field

            console.log(`Adding relation to ${sourceModel}: ${targetFieldNameSingular} ${targetModel} with fields [${sourceField}] references [${targetField}]`);

            updatedSchema = addFieldToModel(
                updatedSchema,
                sourceModel,
                `${targetFieldNameSingular} ${targetModel}`,
                `@relation(fields: [${sourceField}], references: [${targetField}])`
            );
        } else {
            // Foreign key is on target model (default behavior)
            // For 1:1 with FK on one side only, only add relation on the side with FK
            // No relation name needed (only needed when multiple relations exist between same models)
            // Source model doesn't get an inverse relation field

            updatedSchema = addFieldToModel(
                updatedSchema,
                targetModel,
                `${targetFkName} Int`,
                ""
            );

            updatedSchema = addFieldToModel(
                updatedSchema,
                targetModel,
                `${targetFieldNameSingular} ${sourceModel}`,
                `@relation(fields: [${targetFkName}], references: [id])`
            );
        }
    } else if (relationType === "1-M") {
        // One-to-Many: Determine which side has the foreign key
        // The side with the FK is the "many" side, the other is the "one" side

        // Check if sourceField already exists in source model and looks like a foreign key
        const sourceHasFk = fieldExistsInModel(updatedSchema, sourceModel, sourceField);
        const targetHasFk = fieldExistsInModel(updatedSchema, targetModel, sourceFkName);

        // If sourceField exists in source model and ends with "Id", it's the FK
        const sourceFieldIsFk = sourceHasFk && (sourceField.endsWith("Id") || sourceField.endsWith("id"));

        if (relationMode === "implicit") {
            if (sourceFieldIsFk || (!targetHasFk && sourceField.endsWith("Id"))) {
                // Foreign key is on source model (e.g., Post.categoryId)
                // Source (Post) is the "many" side, Target (Category) is the "one" side
                // Source gets: targetFieldNameSingular TargetModel @relation(fields: [sourceField], references: [targetField])
                // Target gets: sourceFieldNamePlural SourceModel[] (array, implicit relation, no name needed)

                // If nullable is selected, make the existing FK field optional
                if (options.nullable?.source) {
                    updatedSchema = makeFieldOptional(updatedSchema, sourceModel, sourceField);
                }

                updatedSchema = addFieldToModel(
                    updatedSchema,
                    sourceModel,
                    `${targetFieldNameSingular} ${targetModel}`,
                    `@relation(fields: [${sourceField}], references: [${targetField}])`
                );

                updatedSchema = addFieldToModel(
                    updatedSchema,
                    targetModel,
                    `${sourceFieldNamePlural} ${sourceModel}[]`,
                    ""
                );
            } else {
                // Foreign key is on target model (default behavior)
                // Target (Category) is the "many" side, Source (Post) is the "one" side
                // Target gets: sourceFkName Int (foreign key) and sourceFieldNameSingular SourceModel @relation(...)
                // Source gets: targetFieldNamePlural TargetModel[] (array, implicit relation, no name needed)

                // If nullable is selected, make the FK field optional
                const fkType = options.nullable?.source ? "Int?" : "Int";
                updatedSchema = addFieldToModel(
                    updatedSchema,
                    targetModel,
                    `${sourceFkName} ${fkType}`,
                    ""
                );

                updatedSchema = addFieldToModel(
                    updatedSchema,
                    targetModel,
                    `${sourceFieldNameSingular} ${sourceModel}`,
                    `@relation(fields: [${sourceFkName}], references: [id])`
                );

                updatedSchema = addFieldToModel(
                    updatedSchema,
                    sourceModel,
                    `${targetFieldNamePlural} ${targetModel}[]`,
                    ""
                );
            }
        } else {
            // Explicit: Not typically used for 1:M, but if selected, treat as implicit
            // (Explicit is mainly for M:M relations)
            if (sourceFieldIsFk || (!targetHasFk && sourceField.endsWith("Id"))) {
                // If nullable is selected, make the existing FK field optional
                if (options.nullable?.source) {
                    updatedSchema = makeFieldOptional(updatedSchema, sourceModel, sourceField);
                }

                updatedSchema = addFieldToModel(
                    updatedSchema,
                    sourceModel,
                    `${targetFieldNameSingular} ${targetModel}`,
                    `@relation(fields: [${sourceField}], references: [${targetField}])`
                );

                updatedSchema = addFieldToModel(
                    updatedSchema,
                    targetModel,
                    `${sourceFieldNamePlural} ${sourceModel}[]`,
                    ""
                );
            } else {
                // If nullable is selected, make the FK field optional
                const fkType = options.nullable?.source ? "Int?" : "Int";
                updatedSchema = addFieldToModel(
                    updatedSchema,
                    targetModel,
                    `${sourceFkName} ${fkType}`,
                    ""
                );

                updatedSchema = addFieldToModel(
                    updatedSchema,
                    targetModel,
                    `${sourceFieldNameSingular} ${sourceModel}`,
                    `@relation(fields: [${sourceFkName}], references: [id])`
                );

                updatedSchema = addFieldToModel(
                    updatedSchema,
                    sourceModel,
                    `${targetFieldNamePlural} ${targetModel}[]`,
                    ""
                );
            }
        }
    } else if (relationType === "M-M") {
        if (relationMode === "implicit") {
            // Implicit Many-to-Many: Add list fields to both models
            // Source model gets: targetFieldNamePlural TargetModel[]
            // Target model gets: sourceFieldNamePlural SourceModel[]
            // Note: Field names are based on model names only, not on the connection fields.
            // The connection direction (Category.id to Post.createdAt or vice versa) doesn't matter.
            // Example: Post <-> Category always results in:
            //   Post: categories Category[]
            //   Category: posts Post[]

            updatedSchema = addFieldToModel(
                updatedSchema,
                sourceModel,
                `${targetFieldNamePlural} ${targetModel}[]`,
                ""
            );

            updatedSchema = addFieldToModel(
                updatedSchema,
                targetModel,
                `${sourceFieldNamePlural} ${sourceModel}[]`,
                ""
            );
        } else {
            // Explicit Many-to-Many: Create junction table model
            // Create junction model: PostOnCategory with postId, categoryId, composite primary key
            // Source model gets: junctionFieldName JunctionModel[]
            // Target model gets: junctionFieldName JunctionModel[]

            const junctionFieldName = junctionModelName.charAt(0).toLowerCase() + junctionModelName.slice(1); // e.g., "postOnCategory"
            const sourceFkField = `${sourceModel.charAt(0).toLowerCase() + sourceModel.slice(1)}Id`; // e.g., "postId"
            const targetFkField = `${targetModel.charAt(0).toLowerCase() + targetModel.slice(1)}Id`; // e.g., "categoryId"

            // Add relation fields to source and target models
            updatedSchema = addFieldToModel(
                updatedSchema,
                sourceModel,
                `${junctionFieldName} ${junctionModelName}[]`,
                ""
            );

            updatedSchema = addFieldToModel(
                updatedSchema,
                targetModel,
                `${junctionFieldName} ${junctionModelName}[]`,
                ""
            );

            // Create the junction model
            updatedSchema = addJunctionModel(
                updatedSchema,
                junctionModelName,
                sourceModel,
                targetModel,
                sourceFkField,
                targetFkField
            );
        }
    }

    return updatedSchema;
}

/**
 * Checks if a field exists in a model
 */
function fieldExistsInModel(
    schemaContent: string,
    modelName: string,
    fieldName: string
): boolean {
    const models = extractModels(schemaContent);
    const model = models.find((m) => m.name === modelName);

    if (!model) {
        return false;
    }

    const modelBody = schemaContent.substring(model.startPos, model.endPos);
    // Check for exact field name match at the start of a line (with proper word boundaries)
    const fieldRegex = new RegExp(`^\\s*${fieldName}\\s+`, 'm');
    return fieldRegex.test(modelBody);
}

function extractModels(schemaContent: string): Array<{ name: string; startPos: number; endPos: number }> {
    const models: Array<{ name: string; startPos: number; endPos: number }> = [];
    const modelRegex = /model\s+(\w+)\s*\{/g;
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
        const modelName = match[1];
        const startPos = match.index + match[0].length;

        // Find matching closing brace
        let braceCount = 1;
        let pos = startPos;
        let endPos = startPos;

        while (pos < schemaContent.length && braceCount > 0) {
            if (schemaContent[pos] === '{') braceCount++;
            if (schemaContent[pos] === '}') braceCount--;
            if (braceCount === 0) {
                endPos = pos;
                break;
            }
            pos++;
        }

        models.push({ name: modelName, startPos, endPos });
    }

    return models;
}

function addFieldToModel(
    schemaContent: string,
    modelName: string,
    fieldDefinition: string,
    attributes: string
): string {
    const models = extractModels(schemaContent);
    const model = models.find((m) => m.name === modelName);

    if (!model) {
        console.warn(`Model ${modelName} not found`);
        return schemaContent;
    }

    // Check if field already exists in model
    const modelBody = schemaContent.substring(model.startPos, model.endPos);
    const fieldName = fieldDefinition.split(/\s+/)[0];

    console.log(`addFieldToModel: Checking if field "${fieldName}" exists in model "${modelName}"`);
    console.log(`Model body preview: ${modelBody.substring(0, 200)}`);

    // More precise check - if field name already exists as a complete field declaration, skip
    // Check for exact field name match at the start of a line (with proper word boundaries)
    const fieldRegex = new RegExp(`^\\s*${fieldName}\\s+`, 'm');
    if (fieldRegex.test(modelBody)) {
        console.log(`Field "${fieldName}" already exists in model "${modelName}", updating instead`);
        // Field already exists, update it instead (only if it's not a protected field like 'id')
        // Don't update protected fields like 'id' that might have @id attribute
        if (fieldName === 'id') {
            // Don't replace id fields - they're protected
            console.log(`Field "${fieldName}" is protected, skipping update`);
            return schemaContent;
        }
        const updated = updateFieldInModel(schemaContent, model, fieldDefinition, attributes);
        console.log(`Field updated, schema length: ${updated.length} (original: ${schemaContent.length})`);
        return updated;
    }

    console.log(`Field "${fieldName}" does not exist in model "${modelName}", adding new field`);

    // Add field before closing brace
    // We'll insert it right before the closing brace of the model
    const beforeModel = schemaContent.substring(0, model.startPos);
    const afterModel = schemaContent.substring(model.endPos);

    // Find last non-empty, non-comment line in model body for indentation
    const modelLines = modelBody.split('\n');
    let indent = '  '; // default indent

    for (let i = modelLines.length - 2; i >= 0; i--) {
        const line = modelLines[i].trim();
        if (line && !line.startsWith('//') && !line.startsWith('}')) {
            const indentMatch = modelLines[i].match(/^(\s*)/);
            if (indentMatch) {
                indent = indentMatch[1];
            }
            break;
        }
    }

    // Construct field line
    let fieldLine = `${indent}${fieldDefinition}`;
    if (attributes) {
        fieldLine += ` ${attributes}`;
    }

    // Insert field before closing brace in model body
    // modelBody does NOT include the closing brace (endPos points to '}' but substring excludes it)
    // So modelBody might end with '\n' or whitespace
    // We need to append our field, then the closing brace comes from afterModel

    let updatedModelBody;
    // Remove trailing whitespace/newlines from modelBody, then add our field
    const trimmedBody = modelBody.replace(/\s+$/, '');

    // Add the new field with proper spacing
    updatedModelBody = trimmedBody + `\n${fieldLine}`;

    console.log(`addFieldToModel: Adding field "${fieldName}" to model "${modelName}"`);
    console.log(`Field line: ${fieldLine}`);

    return beforeModel + updatedModelBody + afterModel;
}

function updateFieldInModel(
    schemaContent: string,
    model: { name: string; startPos: number; endPos: number },
    fieldDefinition: string,
    attributes: string
): string {
    const modelBody = schemaContent.substring(model.startPos, model.endPos);
    const fieldName = fieldDefinition.split(/\s+/)[0];
    const lines = modelBody.split('\n');

    console.log(`updateFieldInModel: Updating field "${fieldName}" in model "${model.name}"`);
    console.log(`Field definition: ${fieldDefinition}`);
    console.log(`Attributes: ${attributes}`);

    // Find the line with the field
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith(fieldName + ' ') || line.trim().startsWith(fieldName + '\t')) {
            // Update this line
            // Remove any trailing closing brace that might be incorrectly on the same line
            const cleanedLine = line.replace(/\s*\}\s*$/, '').trimRight();
            const indentMatch = cleanedLine.match(/^(\s*)/) || line.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : '  ';

            let newFieldLine = `${indent}${fieldDefinition}`;
            if (attributes) {
                newFieldLine += ` ${attributes}`;
            }

            console.log(`Found existing field at line ${i}: "${line.trim()}"`);
            console.log(`Replacing with: "${newFieldLine}"`);

            lines[i] = newFieldLine;
            found = true;
            break;
        }
    }

    if (!found) {
        console.warn(`Field "${fieldName}" not found in model "${model.name}" - this shouldn't happen`);
    }

    // Join lines and ensure model body ends properly (no trailing whitespace)
    let updatedModelBody = lines.join('\n').replace(/\s+$/, '');

    // Ensure model body ends with a newline before the closing brace
    if (!updatedModelBody.endsWith('\n')) {
        updatedModelBody += '\n';
    }

    const afterModel = schemaContent.substring(model.endPos);
    return (
        schemaContent.substring(0, model.startPos) +
        updatedModelBody +
        afterModel
    );
}

/**
 * Makes an existing field optional by adding '?' to its type
 */
function makeFieldOptional(
    schemaContent: string,
    modelName: string,
    fieldName: string
): string {
    const models = extractModels(schemaContent);
    const model = models.find((m) => m.name === modelName);

    if (!model) {
        console.warn(`Model ${modelName} not found`);
        return schemaContent;
    }

    const modelBody = schemaContent.substring(model.startPos, model.endPos);
    const lines = modelBody.split('\n');

    // Find the line with the field
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match field definition: fieldName Type or fieldName Type?
        // Examples: "categoryId Int", "categoryId Int?", "categoryId Int @default(1)"
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith(fieldName + ' ') && !trimmedLine.startsWith(fieldName + '\t')) {
            continue;
        }

        // Match: fieldName followed by type, optional '?', and optional attributes
        const fieldRegex = /^(\w+)\s+([A-Z][a-zA-Z0-9]*)(\??)(\s+.*)?$/;
        const match = trimmedLine.match(fieldRegex);

        if (match && match[1] === fieldName) {
            const [, , type, optionalMarker, rest] = match;

            // If already optional, don't do anything
            if (optionalMarker === '?') {
                console.log(`Field "${fieldName}" is already optional`);
                return schemaContent;
            }

            // Get indentation from original line
            const indentMatch = line.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : '  ';

            // Preserve any attributes that might be on the line
            const attributes = rest ? rest.trim() : '';

            const newFieldLine = `${indent}${fieldName} ${type}?${attributes ? ' ' + attributes : ''}`;

            console.log(`Making field "${fieldName}" optional: "${trimmedLine}" -> "${newFieldLine.trim()}"`);

            lines[i] = newFieldLine;

            const updatedModelBody = lines.join('\n').replace(/\s+$/, '');
            if (!updatedModelBody.endsWith('\n')) {
                return (
                    schemaContent.substring(0, model.startPos) +
                    updatedModelBody + '\n' +
                    schemaContent.substring(model.endPos)
                );
            }

            return (
                schemaContent.substring(0, model.startPos) +
                updatedModelBody +
                schemaContent.substring(model.endPos)
            );
        }
    }

    console.warn(`Field "${fieldName}" not found in model "${modelName}"`);
    return schemaContent;
}

/**
 * Adds a junction model for explicit many-to-many relations
 */
function addJunctionModel(
    schemaContent: string,
    junctionModelName: string,
    sourceModel: string,
    targetModel: string,
    sourceFkField: string,
    targetFkField: string
): string {
    // Check if junction model already exists
    const models = extractModels(schemaContent);
    if (models.some((m) => m.name === junctionModelName)) {
        return schemaContent; // Model already exists
    }

    // Find the last model to insert after
    let insertPosition = schemaContent.length;
    if (models.length > 0) {
        const lastModel = models[models.length - 1];
        insertPosition = lastModel.endPos + 1;

        // Find the position after the closing brace and any whitespace
        let pos = insertPosition;
        while (pos < schemaContent.length && (schemaContent[pos] === '\n' || schemaContent[pos] === ' ' || schemaContent[pos] === '\t')) {
            pos++;
        }
        insertPosition = pos;
    }

    // Generate the junction model
    const indent = '  ';
    const junctionModel = `
model ${junctionModelName} {
  ${sourceFkField} Int
  ${targetFkField} Int
  ${sourceModel.charAt(0).toLowerCase() + sourceModel.slice(1)} ${sourceModel} @relation(fields: [${sourceFkField}], references: [id])
  ${targetModel.charAt(0).toLowerCase() + targetModel.slice(1)} ${targetModel} @relation(fields: [${targetFkField}], references: [id])

  @@id([${sourceFkField}, ${targetFkField}])
}
`;

    // Insert the junction model
    return schemaContent.substring(0, insertPosition) + junctionModel + schemaContent.substring(insertPosition);
}

