import ts from 'typescript';

export type ImportedTypeNameResolver = (name: string) => string;

function identityImportedTypeName(name: string): string {
    return name;
}

// TS 5.9+ removed ts.isKeywordTypeNode — manual kind-based check
const KEYWORD_TYPE_KINDS = new Set([
    ts.SyntaxKind.StringKeyword,
    ts.SyntaxKind.NumberKeyword,
    ts.SyntaxKind.BooleanKeyword,
    ts.SyntaxKind.AnyKeyword,
    ts.SyntaxKind.VoidKeyword,
    ts.SyntaxKind.UndefinedKeyword,
    ts.SyntaxKind.NullKeyword,
    ts.SyntaxKind.NeverKeyword,
    ts.SyntaxKind.UnknownKeyword,
    ts.SyntaxKind.BigIntKeyword,
    ts.SyntaxKind.SymbolKeyword,
    ts.SyntaxKind.ObjectKeyword,
]);

export function isKeywordTypeNode(node: ts.Node): boolean {
    return KEYWORD_TYPE_KINDS.has(node.kind);
}

export function createImportedTypeNameResolver(sf: ts.SourceFile): ImportedTypeNameResolver {
    const localToImported = new Map<string, string>();

    for (const stmt of sf.statements) {
        if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue;
        const bindings = stmt.importClause.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings)) continue;

        for (const el of bindings.elements) {
            localToImported.set(el.name.text, (el.propertyName ?? el.name).text);
        }
    }

    return (name: string) => localToImported.get(name) ?? name;
}

/**
 * Deterministic mangled name for a type node.
 *   `Foo`                → `Foo`
 *   `Foo<string>`        → `Foo__string`
 *   `Foo<Bar<uint_32>>`  → `Foo__Bar__uint_32`
 */
export function typeNodeToMangledName(
    typeNode: ts.TypeNode,
    sf: ts.SourceFile,
    resolveImportedTypeName: ImportedTypeNameResolver = identityImportedTypeName,
): string {
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
        const base = resolveImportedTypeName(typeNode.typeName.text);
        if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
            const args = typeNode.typeArguments.map(a => typeNodeToMangledName(a, sf, resolveImportedTypeName));
            return base + '__' + args.join('__');
        }
        return base;
    }
    if (isKeywordTypeNode(typeNode)) return typeNode.getText(sf);
    return typeNode.getText(sf);
}
