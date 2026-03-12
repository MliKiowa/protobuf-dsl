import { WireType, type ProtobufField, type ProtobufMessage, type MessageRegistry } from '../ast/types.js';

/**
 * Generate the encoder function for a single message.
 */
export function generateEncoder(msg: ProtobufMessage, _registry: MessageRegistry): string {
    const lines = [`function protobuf_encode_${msg.name}(obj) {`, `  const buf = [];`];
    for (const f of msg.fields) lines.push(encodeField(f));
    lines.push(`  return new Uint8Array(buf);`, `}`);
    return lines.join('\n');
}

function encodeField(f: ProtobufField): string {
    if (f.isRepeated) return encodeRepeatedField(f);
    return encodeSingularField(f);
}

// ── singular ──────────────────────────────────────────────────────────

function encodeSingularField(f: ProtobufField): string {
    const { name, fieldNumber, typeName, wireType, isMessage } = f;
    const L: string[] = [];

    if (isMessage) {
        L.push(`  if (obj.${name} != null) {`);
        L.push(`    const nested = protobuf_encode_${typeName}(obj.${name});`);
        L.push(`    __pb_writeTag(${fieldNumber}, 2, buf);`);
        L.push(`    __pb_encodeVarint(nested.length, buf);`);
        L.push(`    for (let i = 0; i < nested.length; i++) buf.push(nested[i]);`);
        L.push(`  }`);
    } else if (typeName === 'string') {
        L.push(`  if (obj.${name} != null && obj.${name} !== "") {`);
        L.push(`    __pb_writeTag(${fieldNumber}, 2, buf);`);
        L.push(`    __pb_writeString(obj.${name}, buf);`);
        L.push(`  }`);
    } else if (typeName === 'bytes') {
        L.push(`  if (obj.${name} != null && obj.${name}.length > 0) {`);
        L.push(`    __pb_writeTag(${fieldNumber}, 2, buf);`);
        L.push(`    __pb_writeBytes(obj.${name}, buf);`);
        L.push(`  }`);
    } else if (typeName === 'bool') {
        L.push(`  if (obj.${name} === true) {`);
        L.push(`    __pb_writeTag(${fieldNumber}, 0, buf);`);
        L.push(`    __pb_encodeVarint(1, buf);`);
        L.push(`  }`);
    } else if (wireType === WireType.Varint) {
        L.push(`  if (obj.${name} != null && obj.${name} !== 0) {`);
        L.push(`    __pb_writeTag(${fieldNumber}, 0, buf);`);
        L.push(`    __pb_encodeVarint(obj.${name} >>> 0, buf);`);
        L.push(`  }`);
    } else if (wireType === WireType.Bit32) {
        L.push(`  if (obj.${name} != null && obj.${name} !== 0) {`);
        L.push(`    __pb_writeTag(${fieldNumber}, 5, buf);`);
        L.push(`    const v = obj.${name};`);
        L.push(`    buf.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);`);
        L.push(`  }`);
    } else if (wireType === WireType.Bit64) {
        L.push(`  if (obj.${name} != null && obj.${name} !== 0) {`);
        L.push(`    __pb_writeTag(${fieldNumber}, 1, buf);`);
        L.push(`    const v = obj.${name};`);
        L.push(`    buf.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff, 0, 0, 0, 0);`);
        L.push(`  }`);
    }

    return L.join('\n');
}

// ── repeated (unpacked, one tag per element) ──────────────────────────

function encodeRepeatedField(f: ProtobufField): string {
    const { name, fieldNumber, typeName, wireType, isMessage } = f;
    const L: string[] = [];

    L.push(`  if (obj.${name} != null && obj.${name}.length > 0) {`);
    L.push(`    for (let i = 0; i < obj.${name}.length; i++) {`);

    if (isMessage) {
        L.push(`      const nested = protobuf_encode_${typeName}(obj.${name}[i]);`);
        L.push(`      __pb_writeTag(${fieldNumber}, 2, buf);`);
        L.push(`      __pb_encodeVarint(nested.length, buf);`);
        L.push(`      for (let j = 0; j < nested.length; j++) buf.push(nested[j]);`);
    } else if (typeName === 'string') {
        L.push(`      __pb_writeTag(${fieldNumber}, 2, buf);`);
        L.push(`      __pb_writeString(obj.${name}[i], buf);`);
    } else if (typeName === 'bytes') {
        L.push(`      __pb_writeTag(${fieldNumber}, 2, buf);`);
        L.push(`      __pb_writeBytes(obj.${name}[i], buf);`);
    } else if (typeName === 'bool') {
        L.push(`      __pb_writeTag(${fieldNumber}, 0, buf);`);
        L.push(`      __pb_encodeVarint(obj.${name}[i] ? 1 : 0, buf);`);
    } else if (wireType === WireType.Varint) {
        L.push(`      __pb_writeTag(${fieldNumber}, 0, buf);`);
        L.push(`      __pb_encodeVarint(obj.${name}[i] >>> 0, buf);`);
    } else if (wireType === WireType.Bit32) {
        L.push(`      __pb_writeTag(${fieldNumber}, 5, buf);`);
        L.push(`      const v = obj.${name}[i];`);
        L.push(`      buf.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);`);
    } else if (wireType === WireType.Bit64) {
        L.push(`      __pb_writeTag(${fieldNumber}, 1, buf);`);
        L.push(`      const v = obj.${name}[i];`);
        L.push(`      buf.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff, 0, 0, 0, 0);`);
    }

    L.push(`    }`);
    L.push(`  }`);
    return L.join('\n');
}
