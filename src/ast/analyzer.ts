import ts from 'typescript';
import { WireType, PRIMITIVE_TYPE_MAP, type ProtobufMessage, type MessageRegistry, type GenericProtobufTemplate } from './types.js';
import { collectInterface, collectGenericInterface } from './collector.js';
import { monomorphizeTypeNode } from './monomorphizer.js';
import { createImportedTypeNameResolver, typeNodeToMangledName } from './utils.js';
import type { ImportedDefinitions } from './import-resolver.js';
import {
  collectProtobufImportBindings,
  matchProtobufCallSite,
  type CanonicalProtobufFn,
} from './callsite.js';
import { buildDependencyRegistry } from './dependency-graph.js';

export { typeNodeToMangledName } from './utils.js';

/** A recorded call-site for later replacement. */
export interface CallSiteRecord {
  fnName: CanonicalProtobufFn;
  exprStart: number;         // position of identifier start
  typeArgsEnd: number;       // position after closing '>'
  firstTypeArg: ts.TypeNode; // the type argument node
  line: number;              // 1-based line for runtime map lookup
  column: number;            // 1-based column for runtime map lookup
}

export interface ResolvedCallSiteRecord extends CallSiteRecord {
  typeName: string;
}

export interface AnalysisResult {
  registry: MessageRegistry;
  callSites: CallSiteRecord[];
  sourceFile: ts.SourceFile;
}

export interface UsedRegistryResult {
  registry: MessageRegistry;
  roots: Set<string>;
  callSites: ResolvedCallSiteRecord[];
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
export function analyze(code: string, filePath: string, imported?: ImportedDefinitions): AnalysisResult {
  const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
  const concrete: ProtobufMessage[] = [];
  const templates = new Map<string, GenericProtobufTemplate>();
  const mono = new Map<string, ProtobufMessage>();
  const callSites: CallSiteRecord[] = [];
  const deferredTypeArgs: ts.TypeNode[] = [];
  const importBindings = collectProtobufImportBindings(sf);
  const resolveImportedTypeName = createImportedTypeNameResolver(sf);

  // Seed with imported definitions
  if (imported) {
    concrete.push(...imported.concrete);
    for (const [k, v] of imported.templates) templates.set(k, v);
  }

  // ── single walk ─────────────────────────────────────────────────────
  ts.forEachChild(sf, function visit(node) {
    if (ts.isInterfaceDeclaration(node)) {
      if (node.typeParameters?.length) {
        const tpl = collectGenericInterface(node, sf, resolveImportedTypeName);
        if (tpl) templates.set(tpl.name, tpl);
      } else {
        const msg = collectInterface(node, sf, resolveImportedTypeName);
        if (msg) concrete.push(msg);
      }
    }

    if (ts.isCallExpression(node)) {
      const cs = matchProtobufCallSite(node, sf, importBindings, {
        allowLegacyUnboundCanonical: true,
      });
      if (cs) {
        deferredTypeArgs.push(cs.firstTypeArg);
        callSites.push(cs);
      }
    }

    ts.forEachChild(node, visit);
  });

  // ── post-walk: monomorphize deferred type args ──────────────────────
  for (const typeArg of deferredTypeArgs) {
    monomorphizeTypeNode(typeArg, sf, templates, mono, resolveImportedTypeName);
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
export function analyzeSource(code: string, filePath: string, imported?: ImportedDefinitions): MessageRegistry {
  return analyze(code, filePath, imported).registry;
}

/**
 * Build a minimal message registry by collecting only call-site root types and
 * their transitive message dependencies.
 */
export function selectUsedRegistry(
  registry: MessageRegistry,
  callSites: CallSiteRecord[],
  sourceFile: ts.SourceFile,
): UsedRegistryResult {
  const roots = new Set<string>();
  const resolved: ResolvedCallSiteRecord[] = [];
  const resolveImportedTypeName = createImportedTypeNameResolver(sourceFile);

  for (const cs of callSites) {
    const typeName = typeNodeToMangledName(cs.firstTypeArg, sourceFile, resolveImportedTypeName);
    if (!registry.has(typeName)) continue;
    roots.add(typeName);
    resolved.push({ ...cs, typeName });
  }

  if (roots.size === 0) {
    return { registry: new Map(), roots, callSites: resolved };
  }

  return {
    registry: buildDependencyRegistry(registry, roots),
    roots,
    callSites: resolved,
  };
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
