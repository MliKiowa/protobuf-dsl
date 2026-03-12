import ts from 'typescript';
import { WireType, PRIMITIVE_TYPE_MAP, type ProtobufMessage, type MessageRegistry, type GenericProtobufTemplate } from './types.js';
import { collectInterface, collectGenericInterface } from './collector.js';
import { monomorphizeTypeNode } from './monomorphizer.js';

// Re-export for consumers
export { typeNodeToMangledName } from './utils.js';

/**
 * Analyze TypeScript source and build a MessageRegistry.
 *
 * Pipeline:
 *  1. Collect concrete + generic interfaces
 *  2. Scan call-sites → monomorphize generics
 *  3. Resolve wire types
 *  4. Topological sort
 */
export function analyzeSource(code: string, filePath: string): MessageRegistry {
  const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
  const concrete: ProtobufMessage[] = [];
  const templates = new Map<string, GenericProtobufTemplate>();
  const mono = new Map<string, ProtobufMessage>();

  // 1 — collect interfaces
  ts.forEachChild(sf, function visit(node) {
    if (ts.isInterfaceDeclaration(node)) {
      if (node.typeParameters?.length) {
        const tpl = collectGenericInterface(node, sf);
        if (tpl) templates.set(tpl.name, tpl);
      } else {
        const msg = collectInterface(node, sf);
        if (msg) concrete.push(msg);
      }
    }
    ts.forEachChild(node, visit);
  });

  // 2 — monomorphize from call-sites
  ts.forEachChild(sf, function scan(node) {
    if (ts.isCallExpression(node)) {
      const e = node.expression;
      if (ts.isIdentifier(e) && (e.text === 'protobuf_encode' || e.text === 'protobuf_decode')) {
        const ta = node.typeArguments;
        if (ta?.length) monomorphizeTypeNode(ta[0], sf, templates, mono);
      }
    }
    ts.forEachChild(node, scan);
  });

  for (const m of mono.values()) concrete.push(m);

  // 3 — resolve wire types
  const names = new Set(concrete.map(m => m.name));
  for (const msg of concrete) {
    for (const f of msg.fields) {
      const prim = PRIMITIVE_TYPE_MAP[f.typeName];
      if (prim) { f.wireType = prim.wireType; f.isMessage = false; }
      else if (names.has(f.typeName)) { f.wireType = WireType.LengthDelim; f.isMessage = true; }
    }
  }

  // 4 — topological sort
  return topoSort(concrete);
}

// ── topological sort ──────────────────────────────────────────────────

function topoSort(messages: ProtobufMessage[]): MessageRegistry {
  const map = new Map(messages.map(m => [m.name, m]));
  const deps = new Map(messages.map(m => [
    m.name,
    new Set(m.fields.filter(f => map.has(f.typeName)).map(f => f.typeName)),
  ]));

  const sorted: ProtobufMessage[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function dfs(name: string): void {
    if (visited.has(name)) return;
    if (visiting.has(name)) throw new Error(`Circular dependency: ${name}`);
    visiting.add(name);
    for (const d of deps.get(name) || []) dfs(d);
    visiting.delete(name);
    visited.add(name);
    sorted.push(map.get(name)!);
  }

  for (const m of messages) dfs(m.name);
  return new Map(sorted.map(m => [m.name, m]));
}
