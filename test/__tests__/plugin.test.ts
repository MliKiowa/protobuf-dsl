import { describe, it, expect } from 'vitest';
import { analyzeSource } from '../../src/ast/analyzer';
import { generateCode } from '../../src/codegen/generator';
import { replaceCallSites } from '../../src/transform/replacer';
import { loadFixture, execAndGet } from '../helpers';

describe('plugin integration', () => {
  it('full transform pipeline', () => {
    const code = loadFixture('real.ts');
    const registry = analyzeSource(code, 'real.ts');
    expect(registry.size).toBe(2);
    expect([...registry.keys()]).toEqual(['TestProtobuf', 'TestProtobufOutput']);

    const gen = generateCode(registry);
    expect(gen).toContain('protobuf_encode_TestProtobuf');
    expect(gen).toContain('protobuf_decode_TestProtobufOutput');

    const { transformedCode, hasReplacements } = replaceCallSites(code, registry);
    expect(hasReplacements).toBe(true);
    expect(transformedCode).toContain('protobuf_encode_TestProtobuf({ name: 123 })');
    expect(transformedCode).toContain('protobuf_decode_TestProtobufOutput(data)');
  });

  it('end-to-end round-trip', () => {
    const gen = generateCode(analyzeSource(loadFixture('real.ts'), 'real.ts'));
    const result = execAndGet<any>(gen + `\n
      const wr = protobuf_encode_TestProtobufOutput({ name: { name: 123 } });
      globalThis.__r = protobuf_decode_TestProtobufOutput(wr);
    `, '__r');
    expect(result.name.name).toBe(123);
  });

  it('wire format: TestProtobuf { name: 123 }', () => {
    const gen = generateCode(analyzeSource(loadFixture('real.ts'), 'real.ts'));
    const enc = execAndGet<Uint8Array>(gen + `\n
      globalThis.__r = protobuf_encode_TestProtobuf({ name: 123 });
    `, '__r');
    expect(enc.length).toBe(2);
    expect(enc[0]).toBe(0x08);
    expect(enc[1]).toBe(123);
  });

  it('wire format: nested message', () => {
    const gen = generateCode(analyzeSource(loadFixture('real.ts'), 'real.ts'));
    const enc = execAndGet<Uint8Array>(gen + `\n
      globalThis.__r = protobuf_encode_TestProtobufOutput({ name: { name: 456 } });
    `, '__r');
    expect(enc[0]).toBe(0x0a);
    expect(enc[1]).toBe(3);
    expect(enc[2]).toBe(0x08);
    expect(enc[3]).toBe(0xc8);
    expect(enc[4]).toBe(0x03);
  });

  it('multi-field round-trip', () => {
    const gen = generateCode(analyzeSource(loadFixture('multi-field.ts'), 't.ts'));
    const result = execAndGet<any>(gen + `\n
      const enc = protobuf_encode_UserProfile({ id: 42, username: "alice", active: true });
      globalThis.__r = protobuf_decode_UserProfile(enc);
    `, '__r');
    expect(result.id).toBe(42);
    expect(result.username).toBe('alice');
    expect(result.active).toBe(true);
  });

  // ── generic monomorphization ───────────────────────────────────────

  it('generic monomorphization registry', () => {
    const registry = analyzeSource(loadFixture('generic-usage.ts'), 'g.ts');
    expect(registry.has('TestProtobufAny__string')).toBe(true);
    expect(registry.has('TestProtobufAny__TestProtobufAny__string')).toBe(true);
  });

  it('generic round-trip', () => {
    const gen = generateCode(analyzeSource(loadFixture('generic-usage.ts'), 'g.ts'));
    const result = execAndGet<any>(gen + `\n
      const enc = protobuf_encode_TestProtobufAny__TestProtobufAny__string({ name: { name: "hello" } });
      globalThis.__r = protobuf_decode_TestProtobufAny__TestProtobufAny__string(enc);
    `, '__r');
    expect(result.name.name).toBe('hello');
  });

  // ── repeated fields ────────────────────────────────────────────────

  it('repeated fields round-trip', () => {
    const gen = generateCode(analyzeSource(loadFixture('repeated.ts'), 't.ts'));
    const result = execAndGet<any>(gen + `\n
      const enc = protobuf_encode_RepeatedMsg({ ids: [10, 20, 30], names: ["foo", "bar"] });
      globalThis.__r = protobuf_decode_RepeatedMsg(enc);
    `, '__r');
    expect(result.ids).toEqual([10, 20, 30]);
    expect(result.names).toEqual(['foo', 'bar']);
  });

  it('repeated empty arrays', () => {
    const gen = generateCode(analyzeSource(loadFixture('repeated.ts'), 't.ts'));
    const result = execAndGet<any>(gen + `\n
      const enc = protobuf_encode_RepeatedMsg({ ids: [], names: [] });
      globalThis.__r = protobuf_decode_RepeatedMsg(enc);
    `, '__r');
    expect(result.ids).toEqual([]);
    expect(result.names).toEqual([]);
  });
});
