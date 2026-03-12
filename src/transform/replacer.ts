import ts from 'typescript';
import type { MessageRegistry } from '../ast/types.js';
import { typeNodeToMangledName } from '../ast/utils.js';

interface TextEdit { start: number; end: number; replacement: string }

/**
 * Replace `protobuf_encode<T>(…)` / `protobuf_decode<T>(…)` calls
 * with monomorphized function names like `protobuf_encode_T(…)`.
 * Supports nested generics: `Foo<Bar<string>>` → `Foo__Bar__string`.
 */
export function replaceCallSites(code: string, registry: MessageRegistry): { transformedCode: string; hasReplacements: boolean } {
  const sf = ts.createSourceFile('input.ts', code, ts.ScriptTarget.Latest, true);
  const edits: TextEdit[] = [];

  ts.forEachChild(sf, function visit(node) {
    if (ts.isCallExpression(node)) {
      const e = node.expression;
      if (ts.isIdentifier(e) && (e.text === 'protobuf_encode' || e.text === 'protobuf_decode')) {
        const ta = node.typeArguments;
        if (ta?.length) {
          const mangled = typeNodeToMangledName(ta[0], sf);
          if (registry.has(mangled)) {
            edits.push({
              start: e.getStart(sf),
              end: ta.end + 1,
              replacement: `${e.text}_${mangled}`,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  });

  if (!edits.length) return { transformedCode: code, hasReplacements: false };

  edits.sort((a, b) => b.start - a.start);
  let result = code;
  for (const ed of edits) result = result.slice(0, ed.start) + ed.replacement + result.slice(ed.end);
  return { transformedCode: result, hasReplacements: true };
}
