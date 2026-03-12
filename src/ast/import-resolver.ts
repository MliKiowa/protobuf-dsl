import ts from 'typescript';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { collectInterface, collectGenericInterface } from './collector.js';
import type { ProtobufMessage, GenericProtobufTemplate } from './types.js';

export interface ParsedFileEntry {
    concrete: ProtobufMessage[];
    templates: Map<string, GenericProtobufTemplate>;
}

export interface ImportedDefinitions {
    concrete: ProtobufMessage[];
    templates: Map<string, GenericProtobufTemplate>;
}

interface ImportClause {
    names: string[];
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
        const names: string[] = [];

        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const el of clause.namedBindings.elements) {
                names.push(el.name.text);
            }
        }

        if (names.length > 0) result.push({ names, specifier });
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
function parseFileForDefinitions(absolutePath: string): ParsedFileEntry {
    const code = readFileSync(absolutePath, 'utf-8');
    const sf = ts.createSourceFile(absolutePath, code, ts.ScriptTarget.Latest, true);
    const concrete: ProtobufMessage[] = [];
    const templates = new Map<string, GenericProtobufTemplate>();

    for (const stmt of sf.statements) {
        if (!ts.isInterfaceDeclaration(stmt)) continue;
        if (stmt.typeParameters?.length) {
            const tpl = collectGenericInterface(stmt, sf);
            if (tpl) templates.set(tpl.name, tpl);
        } else {
            const msg = collectInterface(stmt, sf);
            if (msg) concrete.push(msg);
        }
    }

    return { concrete, templates };
}

/**
 * Recursively resolve import-type declarations from a source file.
 * Returns all protobuf interfaces and templates reachable through imports.
 */
export function resolveImports(
    code: string,
    importerPath: string,
    cache: Map<string, ParsedFileEntry>,
): ImportedDefinitions {
    const concrete: ProtobufMessage[] = [];
    const templates = new Map<string, GenericProtobufTemplate>();
    const visiting = new Set<string>();

    function walk(filePath: string, fileCode?: string) {
        const abs = resolve(filePath);
        if (visiting.has(abs)) return; // cycle
        visiting.add(abs);

        const src = fileCode ?? readFileSync(abs, 'utf-8');
        const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.Latest, true);
        const imports = extractImports(sf);

        for (const imp of imports) {
            const resolved = resolveModulePath(imp.specifier, abs);
            if (!resolved) continue;

            let entry = cache.get(resolved);
            if (!entry) {
                entry = parseFileForDefinitions(resolved);
                cache.set(resolved, entry);
            }

            for (const msg of entry.concrete) {
                if (!concrete.some(m => m.name === msg.name)) {
                    concrete.push(msg);
                }
            }
            for (const [name, tpl] of entry.templates) {
                if (!templates.has(name)) templates.set(name, tpl);
            }

            // Recurse into the imported file for transitive imports
            walk(resolved);
        }
    }

    walk(importerPath, code);
    return { concrete, templates };
}
