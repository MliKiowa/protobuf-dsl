import { describe, it, expect } from 'vitest';
import { analyzeSource } from '../../src/ast/analyzer';
import { generateCode } from '../../src/codegen/generator';
import { RUNTIME_FUNCTIONS } from '../../src/codegen/wire';
import { loadFixture, execAndGet, buildExec } from '../helpers';

/** Helper: analyze fixture → generate → eval → return encode/decode pair */
function makeRoundTrip(fixtureName: string, msgName: string) {
  const registry = analyzeSource(loadFixture(fixtureName), fixtureName);
  const gen = generateCode(registry);
  const code = buildExec(RUNTIME_FUNCTIONS, gen,
    `globalThis.__enc = protobuf_encode_${msgName}; globalThis.__dec = protobuf_decode_${msgName};`);
  new Function(code)();
  const enc = (globalThis as any).__enc as (obj: any) => Uint8Array;
  const dec = (globalThis as any).__dec as (data: Uint8Array) => any;
  delete (globalThis as any).__enc;
  delete (globalThis as any).__dec;
  return { enc, dec };
}

describe('code generator', () => {
  it('generates encode/decode for simple uint_32', () => {
    const gen = generateCode(analyzeSource(loadFixture('simple.ts'), 't.ts'));
    expect(gen).toContain('function protobuf_encode_SimpleMsg(obj)');
    expect(gen).toContain('function protobuf_decode_SimpleMsg(data)');
    expect(gen).toContain('__pb_writeTag(1, 0, buf)');
  });

  it('generates nested message code', () => {
    const gen = generateCode(analyzeSource(loadFixture('nested.ts'), 't.ts'));
    expect(gen).toContain('protobuf_encode_Inner(obj.inner)');
    expect(gen).toContain('protobuf_decode_Inner(data.subarray(lenOff, lenOff + len))');
  });

  it('round-trip uint_32', () => {
    const { enc, dec } = makeRoundTrip('simple.ts', 'SimpleMsg');
    expect(dec(enc({ value: 42 })).value).toBe(42);
  });

  it('round-trip nested message', () => {
    const { enc, dec } = makeRoundTrip('nested.ts', 'Outer');
    expect(dec(enc({ inner: { value: 999 } })).inner.value).toBe(999);
  });

  it('round-trip string', () => {
    const { enc, dec } = makeRoundTrip('string-msg.ts', 'StringMsg');
    expect(dec(enc({ text: 'hello world' })).text).toBe('hello world');
  });

  it('round-trip bool', () => {
    const { enc, dec } = makeRoundTrip('bool-msg.ts', 'BoolMsg');
    expect(dec(enc({ active: true })).active).toBe(true);
    const empty = enc({ active: false });
    expect(empty.length).toBe(0);
    expect(dec(empty).active).toBe(false);
  });

  it('proto3 default encoding (0 → empty)', () => {
    const { enc } = makeRoundTrip('simple.ts', 'SimpleMsg');
    expect(enc({ value: 0 }).length).toBe(0);
  });

  it('round-trip repeated uint_32', () => {
    const { enc, dec } = makeRoundTrip('repeated.ts', 'RepeatedMsg');
    const result = dec(enc({ ids: [10, 20, 30], names: [] }));
    expect(result.ids).toEqual([10, 20, 30]);
    expect(result.names).toEqual([]);
  });

  it('round-trip repeated string', () => {
    const { enc, dec } = makeRoundTrip('repeated.ts', 'RepeatedMsg');
    const result = dec(enc({ ids: [], names: ['hello', 'world'] }));
    expect(result.ids).toEqual([]);
    expect(result.names).toEqual(['hello', 'world']);
  });

  it('repeated empty arrays round-trip', () => {
    const { enc, dec } = makeRoundTrip('repeated.ts', 'RepeatedMsg');
    const result = dec(enc({ ids: [], names: [] }));
    expect(result.ids).toEqual([]);
    expect(result.names).toEqual([]);
  });
});
