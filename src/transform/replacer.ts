import type { MessageRegistry } from '../ast/types.js';
import type { CallSiteRecord } from '../ast/analyzer.js';
import { typeNodeToMangledName } from '../ast/utils.js';
import ts from 'typescript';

interface TextEdit { start: number; end: number; replacement: string }

/**
 * Apply replacements using pre-recorded call-sites from analyze().
 * No parsing or AST walking — just position-based string edits.
 */
export function applyReplacements(
  code: string,
  sf: ts.SourceFile,
  callSites: CallSiteRecord[],
  registry: MessageRegistry,
): { transformedCode: string; hasReplacements: boolean } {
  const edits: TextEdit[] = [];

  for (const cs of callSites) {
    const mangled = typeNodeToMangledName(cs.firstTypeArg, sf);
    if (registry.has(mangled)) {
      edits.push({
        start: cs.exprStart,
        end: cs.typeArgsEnd,
        replacement: `${cs.fnName}_${mangled}`,
      });
    }
  }

  if (!edits.length) return { transformedCode: code, hasReplacements: false };

  edits.sort((a, b) => b.start - a.start);
  let result = code;
  for (const ed of edits) result = result.slice(0, ed.start) + ed.replacement + result.slice(ed.end);
  return { transformedCode: result, hasReplacements: true };
}

/**
 * Backward-compatible: parses + walks on its own.
 * Prefer applyReplacements() with pre-recorded call-sites from analyze().
 */
export function replaceCallSites(code: string, registry: MessageRegistry): { transformedCode: string; hasReplacements: boolean } {
  const sf = ts.createSourceFile('input.ts', code, ts.ScriptTarget.Latest, true);
  const callSites: CallSiteRecord[] = [];

  // Collect import aliases
  const CANONICAL = new Set(['protobuf_encode', 'protobuf_decode']);
  const aliasToCanonical = new Map<string, string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue;
    const bindings = stmt.importClause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const el of bindings.elements) {
      const originalName = (el.propertyName ?? el.name).text;
      if (CANONICAL.has(originalName)) {
        aliasToCanonical.set(el.name.text, originalName);
      }
    }
  }

  ts.forEachChild(sf, function visit(node) {
    if (ts.isCallExpression(node)) {
      const e = node.expression;
      if (ts.isIdentifier(e)) {
        const canonical = CANONICAL.has(e.text) ? e.text : aliasToCanonical.get(e.text);
        if (canonical) {
          const ta = node.typeArguments;
          if (ta?.length) {
            callSites.push({
              fnName: canonical,
              exprStart: e.getStart(sf),
              typeArgsEnd: ta.end + 1,
              firstTypeArg: ta[0],
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  });

  return applyReplacements(code, sf, callSites, registry);
}
