import ts from 'typescript';
import { WireType, type ProtobufField, type ProtobufMessage, type GenericProtobufTemplate } from './types.js';
import { isKeywordTypeNode, typeNodeToMangledName } from './utils.js';

/**
 * Recursively monomorphize a generic type instantiation into concrete ProtobufMessages.
 * E.g. `Wrapper<Wrapper<string>>` → creates `Wrapper__string` and `Wrapper__Wrapper__string`.
 * Returns the mangled name of the concrete type, or null if it cannot be resolved.
 */
export function monomorphizeTypeNode(
    typeNode: ts.TypeNode,
    sf: ts.SourceFile,
    templates: Map<string, GenericProtobufTemplate>,
    out: Map<string, ProtobufMessage>,
): string | null {
    if (!ts.isTypeReferenceNode(typeNode) || !ts.isIdentifier(typeNode.typeName)) return null;

    const baseName = typeNode.typeName.text;
    const typeArgs = typeNode.typeArguments;
    if (!typeArgs || typeArgs.length === 0) return baseName; // already concrete

    const tpl = templates.get(baseName);
    if (!tpl || typeArgs.length !== tpl.typeParams.length) return null;

    const mangledName = typeNodeToMangledName(typeNode, sf);
    if (out.has(mangledName)) return mangledName; // already done

    // Resolve each type parameter → concrete type name
    const paramMap = new Map<string, string>();
    for (let i = 0; i < tpl.typeParams.length; i++) {
        const resolved = resolveTypeArg(typeArgs[i], sf, templates, out);
        if (!resolved) return null;
        paramMap.set(tpl.typeParams[i], resolved);
    }

    // Substitute type params in template fields
    const fields: ProtobufField[] = tpl.fields.map(f => ({
        name: f.name,
        fieldNumber: f.fieldNumber,
        typeName: f.isTypeParam ? (paramMap.get(f.rawTypeName) ?? f.rawTypeName) : f.rawTypeName,
        wireType: WireType.Varint,
        isMessage: false,
        isOptional: f.isOptional,
        isRepeated: f.isRepeated,
    }));

    out.set(mangledName, { name: mangledName, fields });
    return mangledName;
}

function resolveTypeArg(
    node: ts.TypeNode,
    sf: ts.SourceFile,
    templates: Map<string, GenericProtobufTemplate>,
    out: Map<string, ProtobufMessage>,
): string | null {
    // Try recursive monomorphization first (handles nested generics)
    const mono = monomorphizeTypeNode(node, sf, templates, out);
    if (mono) return mono;
    // Keyword type (string, number, …)
    if (isKeywordTypeNode(node)) return node.getText(sf);
    // Simple identifier (uint_32, SomeMsg, …)
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && !node.typeArguments) {
        return node.typeName.text;
    }
    return null;
}
