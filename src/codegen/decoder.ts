import { WireType, PRIMITIVE_TYPE_MAP, type ProtobufField, type ProtobufMessage, type MessageRegistry } from '../ast/types.js';

function tagValue(field: ProtobufField): number {
    const wireType = field.isMessage || field.typeName === 'string' || field.typeName === 'bytes'
        ? WireType.LengthDelim
        : field.wireType;
    return ((field.fieldNumber << 3) | wireType) >>> 0;
}

/** Emit inline varint decode, storing result in `varName`. */
function varintDec(varName: string, ind: string): string {
    return [
        `${ind}let ${varName} = 0, _s = 0, _b;`,
        `${ind}do { _b = data[offset++]; ${varName} |= (_b & 0x7f) << _s; _s += 7; } while (_b & 0x80);`,
    ].join('\n');
}

const INLINE_SKIP = [
    `        const wireType = _tag & 0x7;`,
    `        if (wireType === 0) { while (data[offset] & 0x80) offset++; offset++; }`,
    `        else if (wireType === 1) offset += 8;`,
    `        else if (wireType === 2) { let _l = 0, _s = 0, _b; do { _b = data[offset++]; _l |= (_b & 0x7f) << _s; _s += 7; } while (_b & 0x80); offset += _l; }`,
    `        else if (wireType === 5) offset += 4;`,
].join('\n');

export function generateDecoder(msg: ProtobufMessage, _registry: MessageRegistry): string {
    const defaults = msg.fields.map(f => `${f.name}: ${getDefault(f)}`).join(', ');

    const L = [
        `function protobuf_decode_${msg.name}(data, offset = 0, end = data.length) {`,
        `  const result = { ${defaults} };`,
        `  while (offset < end) {`,
        `    let _tag = 0, _ts = 0, _tb;`,
        `    do { _tb = data[offset++]; _tag |= (_tb & 0x7f) << _ts; _ts += 7; } while (_tb & 0x80);`,
        `    switch (_tag) {`,
    ];

    for (const field of msg.fields) {
        L.push(decodeField(field));
    }

    L.push(
        `      default: {`,
        INLINE_SKIP,
        `        break;`,
        `      }`,
        `    }`,
        `  }`,
        `  return result;`,
        `}`,
    );
    return L.join('\n');
}

function decodeField(field: ProtobufField): string {
    const { name, typeName, wireType, isMessage, isRepeated } = field;
    const I = '        ';
    const assign = (expr: string) => isRepeated
        ? `${I}result.${name}.push(${expr});`
        : `${I}result.${name} = ${expr};`;

    const L: string[] = [`      case ${tagValue(field)}: {`];

    if (isMessage) {
        L.push(varintDec('_len', I));
        L.push(assign(`protobuf_decode_${typeName}(data, offset, offset + _len)`));
        L.push(`${I}offset += _len;`);
    } else if (typeName === 'string') {
        L.push(varintDec('_len', I));
        L.push(assign(`__td.decode(data.subarray(offset, offset + _len))`));
        L.push(`${I}offset += _len;`);
    } else if (typeName === 'bytes') {
        L.push(varintDec('_len', I));
        L.push(assign(`data.slice(offset, offset + _len)`));
        L.push(`${I}offset += _len;`);
    } else if (typeName === 'bool') {
        L.push(varintDec('_val', I));
        L.push(assign(`_val !== 0`));
    } else if (wireType === WireType.Varint) {
        L.push(varintDec('_val', I));
        L.push(assign(`_val >>> 0`));
    } else if (wireType === WireType.Bit32) {
        L.push(assign(`data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)`));
        L.push(`${I}offset += 4;`);
    } else if (wireType === WireType.Bit64) {
        L.push(assign(`data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)`));
        L.push(`${I}offset += 8;`);
    }

    L.push(`${I}break;`, `      }`);
    return L.join('\n');
}

function getDefault(field: ProtobufField): string {
    if (field.isRepeated) return '[]';
    if (field.isOptional || field.isMessage) return 'null';
    const primitive = PRIMITIVE_TYPE_MAP[field.typeName];
    return primitive ? primitive.defaultValue : 'null';
}
