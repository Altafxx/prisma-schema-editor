export interface PrismaField {
    name: string;
    type: string;
    isOptional: boolean;
    isList: boolean;
    attributes?: string[];
    relation?: {
        name?: string;
        fields?: string[];
        references?: string[];
    };
}

export interface PrismaModel {
    name: string;
    fields: PrismaField[];
    attributes?: string[];
}

export interface PrismaEnum {
    name: string;
    values: string[];
}

export interface ParsedPrismaSchema {
    models: PrismaModel[];
    enums: PrismaEnum[];
    datasource?: {
        provider: string;
        url?: string;
    };
    generator?: {
        provider: string;
        output?: string;
    };
}

