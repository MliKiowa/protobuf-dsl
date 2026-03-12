import ts from 'typescript';

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

/**
 * Deterministic mangled name for a type node.
 *   `Foo`                → `Foo`
 *   `Foo<string>`        → `Foo__string`
 *   `Foo<Bar<uint_32>>`  → `Foo__Bar__uint_32`
 */
export function typeNodeToMangledName(typeNode: ts.TypeNode, sf: ts.SourceFile): string {
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
        const base = typeNode.typeName.text;
        if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
            const args = typeNode.typeArguments.map(a => typeNodeToMangledName(a, sf));
            return base + '__' + args.join('__');
        }
        return base;
    }
    if (isKeywordTypeNode(typeNode)) return typeNode.getText(sf);
    return typeNode.getText(sf);
}
