import ts from 'typescript';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { collectInterface, collectGenericInterface } from './collector.js';
import { PRIMITIVE_TYPE_MAP, type ProtobufMessage, type GenericProtobufTemplate } from './types.js';
import { createImportedTypeNameResolver, isKeywordTypeNode, type ImportedTypeNameResolver } from './utils.js';
import { collectProtobufImportBindings, matchProtobufCallSite } from './callsite.js';

export interface ParsedFileEntry {
    filePath: string;
    concrete: ProtobufMessage[];
    templates: Map<string, GenericProtobufTemplate>;
    importedTypeSources: Map<string, string>;
    resolveImportedTypeName: ImportedTypeNameResolver;
}

export interface ImportedDefinitions {
    concrete: ProtobufMessage[];
    templates: Map<string, GenericProtobufTemplate>;
}

interface ImportClause {
    importedName: string;
    specifier: string;
}

/** Extract all named imports from the source file (both type and value imports). */
function extractImports(sf: ts.SourceFile): ImportClause[] {
    const result: ImportClause[] = [];
    for (const stmt of sf.statements) {
        if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue;
        const spec = stmt.moduleSpecifier;
        if (!ts.isStringLiteral(spec)) continue;
        const specifier = spec.text;

        const clause = stmt.importClause;
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const el of clause.namedBindings.elements) {
                result.push({
                    importedName: (el.propertyName ?? el.name).text,
                    specifier,
                });
            }
        }
    }
    return result;
}

/** Resolve a relative module specifier to an absolute file path. Returns null if not found. */
function resolveModulePath(specifier: string, importerPath: string): string | null {
    if (!specifier.startsWith('.')) return null; // skip bare/alias specifiers

    const base = resolve(dirname(importerPath), specifier);

    // Try exact path (e.g., './types.ts')
    if (existsSync(base) && !base.endsWith('.ts') === false) return base;
    if (base.endsWith('.ts') && existsSync(base)) return base;

    // Try appending .ts
    const withTs = base + '.ts';
    if (existsSync(withTs)) return withTs;

    // Try as directory with index.ts
    const indexTs = resolve(base, 'index.ts');
    if (existsSync(indexTs)) return indexTs;

    return null;
}

/** Parse a file and extract its protobuf interfaces and generic templates. */
function parseFileForDefinitions(absolutePath: string, code?: string): ParsedFileEntry {
    const sourceText = code ?? readFileSync(absolutePath, 'utf-8');
    const sf = ts.createSourceFile(absolutePath, sourceText, ts.ScriptTarget.Latest, true);
    const concrete: ProtobufMessage[] = [];
    const templates = new Map<string, GenericProtobufTemplate>();
    const resolveImportedTypeName = createImportedTypeNameResolver(sf);
    const importedTypeSources = new Map<string, string>();

    for (const imp of extractImports(sf)) {
        const resolved = resolveModulePath(imp.specifier, absolutePath);
        if (!resolved) continue;
        importedTypeSources.set(imp.importedName, resolved);
    }

    for (const stmt of sf.statements) {
        if (!ts.isInterfaceDeclaration(stmt)) continue;
        if (stmt.typeParameters?.length) {
            const tpl = collectGenericInterface(stmt, sf, resolveImportedTypeName);
            if (tpl) templates.set(tpl.name, tpl);
        } else {
            const msg = collectInterface(stmt, sf, resolveImportedTypeName);
            if (msg) concrete.push(msg);
        }
    }

    return {
        filePath: absolutePath,
        concrete,
        templates,
        importedTypeSources,
        resolveImportedTypeName,
    };
}

function collectCallRootTypeNodes(sf: ts.SourceFile): ts.TypeNode[] {
    const roots: ts.TypeNode[] = [];
    const importBindings = collectProtobufImportBindings(sf);

    ts.forEachChild(sf, function visit(node) {
        if (ts.isCallExpression(node)) {
            const cs = matchProtobufCallSite(node, sf, importBindings, {
                allowLegacyUnboundCanonical: true,
            });
            if (cs) roots.push(cs.firstTypeArg);
        }

        ts.forEachChild(node, visit);
    });

    return roots;
}

/**
 * Resolve only the import definitions reachable from protobuf call-site roots.
 */
export function resolveImports(
    code: string,
    importerPath: string,
    cache: Map<string, ParsedFileEntry>,
): ImportedDefinitions {
    const entryPath = resolve(importerPath);
    const entry = parseFileForDefinitions(entryPath, code);
    const concrete = new Map<string, ProtobufMessage>();
    const templates = new Map<string, GenericProtobufTemplate>();
    const fileEntries = new Map<string, ParsedFileEntry>([[entryPath, entry]]);
    const visitedConcrete = new Set<string>();
    const visitedTemplates = new Set<string>();

    function getEntry(filePath: string): ParsedFileEntry {
        const abs = resolve(filePath);
        const known = fileEntries.get(abs);
        if (known) return known;

        let parsed = cache.get(abs);
        if (!parsed) {
            parsed = parseFileForDefinitions(abs);
            cache.set(abs, parsed);
        }

        fileEntries.set(abs, parsed);
        return parsed;
    }

    function resolveTypeName(typeName: string, from: ParsedFileEntry): void {
        if (typeName in PRIMITIVE_TYPE_MAP) return;

        const concreteMsg = from.concrete.find(msg => msg.name === typeName);
        if (concreteMsg) {
            const visitKey = `${from.filePath}:message:${typeName}`;
            if (visitedConcrete.has(visitKey)) return;
            visitedConcrete.add(visitKey);

            if (from.filePath !== entryPath && !concrete.has(concreteMsg.name)) {
                concrete.set(concreteMsg.name, concreteMsg);
            }

            for (const field of concreteMsg.fields) {
                resolveTypeName(field.typeName, from);
            }
            return;
        }

        const template = from.templates.get(typeName);
        if (template) {
            const visitKey = `${from.filePath}:template:${typeName}`;
            if (visitedTemplates.has(visitKey)) return;
            visitedTemplates.add(visitKey);

            if (from.filePath !== entryPath && !templates.has(template.name)) {
                templates.set(template.name, template);
            }

            for (const field of template.fields) {
                if (!field.isTypeParam) resolveTypeName(field.rawTypeName, from);
            }
            return;
        }

        const importedPath = from.importedTypeSources.get(typeName);
        if (!importedPath) return;

        resolveTypeName(typeName, getEntry(importedPath));
    }

    function resolveTypeNode(typeNode: ts.TypeNode, from: ParsedFileEntry): void {
        if (isKeywordTypeNode(typeNode)) return;
        if (!ts.isTypeReferenceNode(typeNode) || !ts.isIdentifier(typeNode.typeName)) return;

        const typeName = from.resolveImportedTypeName(typeNode.typeName.text);
        resolveTypeName(typeName, from);

        if (!typeNode.typeArguments?.length) return;
        for (const typeArg of typeNode.typeArguments) {
            resolveTypeNode(typeArg, from);
        }
    }

    const rootTypeNodes = collectCallRootTypeNodes(ts.createSourceFile(entryPath, code, ts.ScriptTarget.Latest, true));
    for (const rootTypeNode of rootTypeNodes) {
        resolveTypeNode(rootTypeNode, entry);
    }

    return { concrete: [...concrete.values()], templates };
}
