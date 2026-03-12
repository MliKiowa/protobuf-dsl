import { WireType, PRIMITIVE_TYPE_MAP, type ProtobufField, type ProtobufMessage, type MessageRegistry } from '../ast/types.js';

/**
 * Generate the decoder function for a single message.
 */
export function generateDecoder(msg: ProtobufMessage, _registry: MessageRegistry): string {
    const defaults = msg.fields.map(f => `${f.name}: ${getDefaultValue(f)}`).join(', ');

    const L = [
        `function protobuf_decode_${msg.name}(data) {`,
        `  const result = { ${defaults} };`,
        `  let offset = 0;`,
        `  while (offset < data.length) {`,
        `    const [tag, tagOffset] = __pb_decodeVarint(data, offset);`,
        `    offset = tagOffset;`,
        `    const fieldNumber = tag >>> 3;`,
        `    const wireType = tag & 0x7;`,
        `    switch (fieldNumber) {`,
    ];

    for (const f of msg.fields) L.push(decodeField(f));

    L.push(
        `      default: offset = __pb_skipField(data, offset, wireType); break;`,
        `    }`,
        `  }`,
        `  return result;`,
        `}`,
    );
    return L.join('\n');
}

// ── field decoder ─────────────────────────────────────────────────────

function decodeField(f: ProtobufField): string {
    const { name, fieldNumber, typeName, wireType, isMessage, isRepeated } = f;
    const L: string[] = [`      case ${fieldNumber}: {`];
    const target = isRepeated ? `result.${name}` : `result`;
    const assign = (expr: string) => isRepeated ? `        ${target}.push(${expr});` : `        result.${name} = ${expr};`;

    if (isMessage) {
        L.push(`        const [len, lenOff] = __pb_decodeVarint(data, offset);`);
        L.push(assign(`protobuf_decode_${typeName}(data.subarray(lenOff, lenOff + len))`));
        L.push(`        offset = lenOff + len;`);
    } else if (typeName === 'string') {
        L.push(`        const [len, lenOff] = __pb_decodeVarint(data, offset);`);
        L.push(assign(`__pb_readString(data, lenOff, len)`));
        L.push(`        offset = lenOff + len;`);
    } else if (typeName === 'bytes') {
        L.push(`        const [len, lenOff] = __pb_decodeVarint(data, offset);`);
        L.push(assign(`data.slice(lenOff, lenOff + len)`));
        L.push(`        offset = lenOff + len;`);
    } else if (typeName === 'bool') {
        L.push(`        const [v, nextOff] = __pb_decodeVarint(data, offset);`);
        L.push(assign(`v !== 0`));
        L.push(`        offset = nextOff;`);
    } else if (wireType === WireType.Varint) {
        L.push(`        const [v, nextOff] = __pb_decodeVarint(data, offset);`);
        L.push(assign(`v >>> 0`));
        L.push(`        offset = nextOff;`);
    } else if (wireType === WireType.Bit32) {
        L.push(assign(`data[offset] | (data[offset+1] << 8) | (data[offset+2] << 16) | (data[offset+3] << 24)`));
        L.push(`        offset += 4;`);
    } else if (wireType === WireType.Bit64) {
        L.push(assign(`data[offset] | (data[offset+1] << 8) | (data[offset+2] << 16) | (data[offset+3] << 24)`));
        L.push(`        offset += 8;`);
    }

    L.push(`        break;`, `      }`);
    return L.join('\n');
}

// ── defaults ──────────────────────────────────────────────────────────

function getDefaultValue(f: ProtobufField): string {
    if (f.isRepeated) return '[]';
    if (f.isOptional || f.isMessage) return 'null';
    const prim = PRIMITIVE_TYPE_MAP[f.typeName];
    return prim ? prim.defaultValue : 'null';
}
