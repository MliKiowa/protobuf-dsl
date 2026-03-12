import { analyzeSource } from '../src/ast/analyzer';
import { generateCode } from '../src/codegen/generator';
import protobuf from 'protobufjs';

// ── helpers ───────────────────────────────────────────────────────────

function makeViteFns(schema: string, msgName: string) {
    const gen = generateCode(analyzeSource(schema, 'b.ts'));
    const g: Record<string, any> = {};
    new Function('g', gen + `\ng.enc = protobuf_encode_${msgName}; g.dec = protobuf_decode_${msgName};`)(g);
    return { encode: g.enc as (o: any) => Uint8Array, decode: g.dec as (d: Uint8Array) => any };
}

function makePbjsFns(def: Record<string, any>, typeName: string) {
    const root = protobuf.Root.fromJSON({ nested: def });
    const T = root.lookupType(typeName);
    return {
        encode: (o: any) => T.encode(T.create(o)).finish(),
        decode: (d: Uint8Array) => T.toObject(T.decode(d)),
    };
}

interface BenchResult { name: string; opsPerSec: number; nsPerOp: number }

function bench(name: string, fn: () => void, iterations = 500_000): BenchResult {
    for (let i = 0; i < 2000; i++) fn(); // warmup
    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const ms = performance.now() - start;
    const opsPerSec = Math.round(iterations / ms * 1000);
    const nsPerOp = Math.round(ms / iterations * 1_000_000);
    return { name, opsPerSec, nsPerOp };
}

function printSection(title: string, results: BenchResult[]) {
    console.log(`\n## ${title}`);
    console.log('| Library | ops/sec | ns/op | relative |');
    console.log('|---------|---------|-------|----------|');
    // baseline for relative comparison is protobufjs
    const base = results.find(r => r.name === 'protobufjs')?.opsPerSec || results[1]?.opsPerSec;
    for (const r of results) {
        const rel = base ? (r.opsPerSec / base) : 1;
        const relStr = r.name === 'protobufjs' ? '1×' : `${rel.toFixed(2)}×`;
        console.log(`| ${r.name} | ${r.opsPerSec.toLocaleString()} | ${r.nsPerOp} | ${relStr} |`);
    }
}

// ── schemas ───────────────────────────────────────────────────────────

// Simple: 1 field
const simpleSchema = `interface SimpleMsg { value: pb<1, uint_32>; }`;
const simplePbjs = { SimpleMsg: { fields: { value: { type: 'uint32', id: 1 } } } };
const simpleObj = { value: 12345 };

// Multi-field
const multiSchema = `
interface UserProfile {
  id: pb<1, uint_32>;
  username: pb<2, string>;
  active: pb<3, bool>;
}`;
const multiPbjs = {
    UserProfile: {
        fields: {
            id: { type: 'uint32', id: 1 },
            username: { type: 'string', id: 2 },
            active: { type: 'bool', id: 3 },
        }
    },
};
const multiObj = { id: 42, username: 'alice_wonderland', active: true };

// Nested
const nestedSchema = `
interface Inner { value: pb<1, uint_32>; }
interface Outer { inner: pb<1, Inner>; }`;
const nestedPbjs = {
    Inner: { fields: { value: { type: 'uint32', id: 1 } } },
    Outer: { fields: { inner: { type: 'Inner', id: 1 } } },
};
const nestedObj = { inner: { value: 999 } };

// ── run benchmarks ────────────────────────────────────────────────────

console.log('# protobuf-dsl Performance Benchmark\n');
console.log(`Node ${process.version} | ${process.platform} ${process.arch}`);
console.log(`Date: ${new Date().toISOString().slice(0, 10)}`);

// Simple
{
    const vite = makeViteFns(simpleSchema, 'SimpleMsg');
    const pbjs = makePbjsFns(simplePbjs, 'SimpleMsg');
    const vEnc = vite.encode(simpleObj);
    const pEnc = pbjs.encode(simpleObj);

    printSection('Encode — SimpleMsg { value: 12345 }', [
        bench('protobuf-dsl', () => vite.encode(simpleObj)),
        bench('protobufjs', () => pbjs.encode(simpleObj)),
    ]);
    printSection('Decode — SimpleMsg', [
        bench('protobuf-dsl', () => vite.decode(vEnc)),
        bench('protobufjs', () => pbjs.decode(pEnc)),
    ]);
    console.log(`\n> Wire size: protobuf ${vEnc.length}B`);
}

// Multi-field
{
    const vite = makeViteFns(multiSchema, 'UserProfile');
    const pbjs = makePbjsFns(multiPbjs, 'UserProfile');
    const vEnc = vite.encode(multiObj);
    const pEnc = pbjs.encode(multiObj);

    printSection('Encode — UserProfile { id, username, active }', [
        bench('protobuf-dsl', () => vite.encode(multiObj)),
        bench('protobufjs', () => pbjs.encode(multiObj)),
    ]);
    printSection('Decode — UserProfile', [
        bench('protobuf-dsl', () => vite.decode(vEnc)),
        bench('protobufjs', () => pbjs.decode(pEnc)),
    ]);
    console.log(`\n> Wire size: protobuf ${vEnc.length}B`);
}

// Nested
{
    const vite = makeViteFns(nestedSchema, 'Outer');
    const pbjs = makePbjsFns(nestedPbjs, 'Outer');
    const vEnc = vite.encode(nestedObj);
    const pEnc = pbjs.encode(nestedObj);

    printSection('Encode — Outer { inner: Inner }', [
        bench('protobuf-dsl', () => vite.encode(nestedObj)),
        bench('protobufjs', () => pbjs.encode(nestedObj)),
    ]);
    printSection('Decode — Outer', [
        bench('protobuf-dsl', () => vite.decode(vEnc)),
        bench('protobufjs', () => pbjs.decode(pEnc)),
    ]);
    console.log(`\n> Wire size: protobuf ${vEnc.length}B`);
}
