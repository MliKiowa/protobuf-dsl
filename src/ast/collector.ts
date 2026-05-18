import ts from 'typescript';
import {
    WireType,
    PB_MARKER, PB_REPEATED_MARKER,
    type ProtobufField, type ProtobufMessage,
    type GenericProtobufTemplate, type GenericFieldTemplate,
} from './types.js';
import { isKeywordTypeNode, type ImportedTypeNameResolver } from './utils.js';

function identityImportedTypeName(name: string): string {
    return name;
}

/** Collect a concrete (non-generic) interface with pb<>/pb_repeated<> fields. */
export function collectInterface(
    node: ts.InterfaceDeclaration,
    sf: ts.SourceFile,
    resolveImportedTypeName: ImportedTypeNameResolver = identityImportedTypeName,
): ProtobufMessage | null {
    const fields: ProtobufField[] = [];
    for (const m of node.members) {
        if (!ts.isPropertySignature(m) || !m.type) continue;
        const f = extractField(m, sf, resolveImportedTypeName);
        if (f) fields.push(f);
    }
    return fields.length ? { name: node.name.text, fields } : null;
}

/** Collect a generic interface template. */
export function collectGenericInterface(
    node: ts.InterfaceDeclaration,
    sf: ts.SourceFile,
    resolveImportedTypeName: ImportedTypeNameResolver = identityImportedTypeName,
): GenericProtobufTemplate | null {
    const typeParams = node.typeParameters!.map(p => p.name.text);
    const tpSet = new Set(typeParams);
    const fields: GenericFieldTemplate[] = [];
    for (const m of node.members) {
        if (!ts.isPropertySignature(m) || !m.type) continue;
        const f = extractGenericField(m, sf, tpSet, resolveImportedTypeName);
        if (f) fields.push(f);
    }
    return fields.length ? { name: node.name.text, typeParams, fields } : null;
}

// ── helpers ───────────────────────────────────────────────────────────

function parsePbTypeRef(member: ts.PropertySignature): { marker: string; fieldNumber: number; typeArgNode: ts.TypeNode } | null {
    const t = member.type!;
    if (!ts.isTypeReferenceNode(t) || !ts.isIdentifier(t.typeName)) return null;
    const marker = t.typeName.text;
    if (marker !== PB_MARKER && marker !== PB_REPEATED_MARKER) return null;
    const ta = t.typeArguments;
    if (!ta || ta.length !== 2) return null;
    const fnNode = ta[0];
    if (!ts.isLiteralTypeNode(fnNode) || !ts.isNumericLiteral(fnNode.literal)) return null;
    return { marker, fieldNumber: Number(fnNode.literal.text), typeArgNode: ta[1] };
}

function resolveTypeName(
    node: ts.TypeNode,
    sf: ts.SourceFile,
    resolveImportedTypeName: ImportedTypeNameResolver,
): string | null {
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
        return resolveImportedTypeName(node.typeName.text);
    }
    if (isKeywordTypeNode(node)) return node.getText(sf);
    return null;
}

function extractField(
    member: ts.PropertySignature,
    sf: ts.SourceFile,
    resolveImportedTypeName: ImportedTypeNameResolver,
): ProtobufField | null {
    const parsed = parsePbTypeRef(member);
    if (!parsed) return null;
    const typeName = resolveTypeName(parsed.typeArgNode, sf, resolveImportedTypeName);
    if (!typeName || !ts.isIdentifier(member.name)) return null;
    return {
        name: (member.name as ts.Identifier).text,
        fieldNumber: parsed.fieldNumber,
        typeName,
        wireType: WireType.Varint,   // placeholder
        isMessage: false,             // placeholder
        isOptional: member.questionToken != null,
        isRepeated: parsed.marker === PB_REPEATED_MARKER,
    };
}

function extractGenericField(
    member: ts.PropertySignature,
    sf: ts.SourceFile,
    tpSet: Set<string>,
    resolveImportedTypeName: ImportedTypeNameResolver,
): GenericFieldTemplate | null {
    const parsed = parsePbTypeRef(member);
    if (!parsed) return null;
    const raw = resolveTypeName(parsed.typeArgNode, sf, resolveImportedTypeName);
    if (!raw || !ts.isIdentifier(member.name)) return null;
    return {
        name: (member.name as ts.Identifier).text,
        fieldNumber: parsed.fieldNumber,
        rawTypeName: tpSet.has(raw) ? raw : resolveImportedTypeName(raw),
        isTypeParam: tpSet.has(raw),
        isOptional: member.questionToken != null,
        isRepeated: parsed.marker === PB_REPEATED_MARKER,
    };
}
