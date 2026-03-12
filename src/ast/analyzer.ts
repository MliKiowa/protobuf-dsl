import ts from 'typescript';
import { WireType, PRIMITIVE_TYPE_MAP, type ProtobufMessage, type MessageRegistry, type GenericProtobufTemplate } from './types.js';
import { collectInterface, collectGenericInterface } from './collector.js';
import { monomorphizeTypeNode } from './monomorphizer.js';
import { typeNodeToMangledName } from './utils.js';

export { typeNodeToMangledName } from './utils.js';

/** A recorded call-site for later replacement. */
export interface CallSiteRecord {
  fnName: string;            // 'protobuf_encode' | 'protobuf_decode'
  exprStart: number;         // position of identifier start
  typeArgsEnd: number;       // position after closing '>'
  firstTypeArg: ts.TypeNode; // the type argument node
}

export interface AnalysisResult {
  registry: MessageRegistry;
  callSites: CallSiteRecord[];
  sourceFile: ts.SourceFile;
}

/**
 * Analyze TypeScript source in a **single parse + single walk**.
 *
 * One walk handles both:
 *  - Collecting concrete + generic interfaces
 *  - Recording protobuf_encode/decode call-sites
 *
 * Then post-processes: monomorphize → resolve wire types → topo sort.
 */
export function analyze(code: string, filePath: string): AnalysisResult {
  const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
  const concrete: ProtobufMessage[] = [];
  const templates = new Map<string, GenericProtobufTemplate>();
  const mono = new Map<string, ProtobufMessage>();
  const callSites: CallSiteRecord[] = [];
  const deferredTypeArgs: ts.TypeNode[] = [];

  // ── single walk ─────────────────────────────────────────────────────
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

    if (ts.isCallExpression(node)) {
      const e = node.expression;
      if (ts.isIdentifier(e) && (e.text === 'protobuf_encode' || e.text === 'protobuf_decode')) {
        const ta = node.typeArguments;
        if (ta?.length) {
          deferredTypeArgs.push(ta[0]);
          callSites.push({
            fnName: e.text,
            exprStart: e.getStart(sf),
            typeArgsEnd: ta.end + 1,
            firstTypeArg: ta[0],
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  });

  // ── post-walk: monomorphize deferred type args ──────────────────────
  for (const typeArg of deferredTypeArgs) {
    monomorphizeTypeNode(typeArg, sf, templates, mono);
  }
  for (const m of mono.values()) concrete.push(m);

  // ── resolve wire types ──────────────────────────────────────────────
  const names = new Set(concrete.map(m => m.name));
  for (const msg of concrete) {
    for (const f of msg.fields) {
      const prim = PRIMITIVE_TYPE_MAP[f.typeName];
      if (prim) { f.wireType = prim.wireType; f.isMessage = false; }
      else if (names.has(f.typeName)) { f.wireType = WireType.LengthDelim; f.isMessage = true; }
    }
  }

  return { registry: topoSort(concrete), callSites, sourceFile: sf };
}

/**
 * Backward-compatible wrapper: returns only the MessageRegistry.
 * Uses the same single-walk analysis internally.
 */
export function analyzeSource(code: string, filePath: string): MessageRegistry {
  return analyze(code, filePath).registry;
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
