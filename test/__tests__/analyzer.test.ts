import { describe, it, expect } from 'vitest';
import { analyzeSource } from '../../src/ast/analyzer';
import { loadFixture } from '../helpers';

describe('AST analyzer', () => {
  it('collects TestProtobuf with correct fields', () => {
    const registry = analyzeSource(loadFixture('real.ts'), 'real.ts');
    const msg = registry.get('TestProtobuf')!;
    expect(msg).toBeDefined();
    expect(msg.fields).toHaveLength(1);
    expect(msg.fields[0]).toMatchObject({ name: 'name', fieldNumber: 1, typeName: 'uint_32', isMessage: false });
  });

  it('collects nested message field', () => {
    const registry = analyzeSource(loadFixture('real.ts'), 'real.ts');
    const msg = registry.get('TestProtobufOutput')!;
    expect(msg.fields[0]).toMatchObject({ name: 'name', fieldNumber: 1, typeName: 'TestProtobuf', isMessage: true });
  });

  it('topological order: dependencies first', () => {
    const keys = [...analyzeSource(loadFixture('real.ts'), 'real.ts').keys()];
    expect(keys.indexOf('TestProtobuf')).toBeLessThan(keys.indexOf('TestProtobufOutput'));
  });

  it('skips generic interfaces (no call sites)', () => {
    expect(analyzeSource(loadFixture('generic-template.ts'), 'g.ts').size).toBe(0);
  });

  it('returns empty for non-pb interfaces', () => {
    expect(analyzeSource(loadFixture('no-pb.ts'), 'no.ts').size).toBe(0);
  });

  it('handles multiple fields', () => {
    const msg = analyzeSource(loadFixture('multi-field.ts'), 't.ts').get('UserProfile')!;
    expect(msg.fields).toHaveLength(3);
    expect(msg.fields[0]).toMatchObject({ name: 'id', fieldNumber: 1, typeName: 'uint_32' });
    expect(msg.fields[1]).toMatchObject({ name: 'username', fieldNumber: 2, typeName: 'string' });
    expect(msg.fields[2]).toMatchObject({ name: 'active', fieldNumber: 3, typeName: 'bool' });
  });

  it('collects repeated fields', () => {
    const msg = analyzeSource(loadFixture('repeated.ts'), 't.ts').get('RepeatedMsg')!;
    expect(msg.fields).toHaveLength(2);
    expect(msg.fields[0]).toMatchObject({ name: 'ids', fieldNumber: 1, typeName: 'uint_32', isRepeated: true });
    expect(msg.fields[1]).toMatchObject({ name: 'names', fieldNumber: 2, typeName: 'string', isRepeated: true });
  });

  it('monomorphizes generics from call sites', () => {
    const registry = analyzeSource(loadFixture('generic-usage.ts'), 'g.ts');
    expect(registry.has('TestProtobufAny__string')).toBe(true);
    expect(registry.has('TestProtobufAny__TestProtobufAny__string')).toBe(true);
  });
});
