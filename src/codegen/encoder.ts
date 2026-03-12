import { WireType, type ProtobufField, type ProtobufMessage, type MessageRegistry } from '../ast/types.js';

/**
 * Pre-compute tag bytes at codegen time.
 * Field 1 + Varint(0) → [0x08], Field 1 + LenDelim(2) → [0x0a], etc.
 */
function computeTagBytes(fieldNumber: number, wireType: number): number[] {
    let v = ((fieldNumber << 3) | wireType) >>> 0;
    const bytes: number[] = [];
    while (v > 0x7f) { bytes.push((v & 0x7f) | 0x80); v >>>= 7; }
    bytes.push(v & 0x7f);
    return bytes;
}

/** Emit a pre-computed tag push. */
function tag(fn: number, wt: number, ind: string): string {
    return `${ind}buf.push(${computeTagBytes(fn, wt).join(', ')});`;
}

/** Emit inline varint encode of an expression. */
function varintEnc(expr: string, ind: string): string {
    return [
        `${ind}let _v = ${expr};`,
        `${ind}while (_v > 0x7f) { buf.push((_v & 0x7f) | 0x80); _v >>>= 7; }`,
        `${ind}buf.push(_v & 0x7f);`,
    ].join('\n');
}

/** Emit inline length-delimited write (tag + length varint + data copy). */
function lenDelimWrite(fn: number, dataExpr: string, lenExpr: string, ind: string): string {
    return [
        tag(fn, 2, ind),
        varintEnc(lenExpr, ind),
        `${ind}for (let _i = 0; _i < ${lenExpr.replace('let _v = ', '').replace(';', '')}; _i++) buf.push(${dataExpr}[_i]);`,
    ].join('\n');
}

// ── public ────────────────────────────────────────────────────────────

export function generateEncoder(msg: ProtobufMessage, _registry: MessageRegistry): string {
    const L = [`function protobuf_encode_${msg.name}(obj) {`, `  const buf = [];`];
    for (const f of msg.fields) L.push(f.isRepeated ? encRepeated(f) : encSingular(f));
    L.push(`  return new Uint8Array(buf);`, `}`);
    return L.join('\n');
}

// ── singular ──────────────────────────────────────────────────────────

function encSingular(f: ProtobufField): string {
    const { name, fieldNumber: fn, typeName, wireType, isMessage } = f;
    const I = '    '; // indent inside if

    if (isMessage) {
        return [
            `  if (obj.${name} != null) {`,
            `${I}const _nested = protobuf_encode_${typeName}(obj.${name});`,
            tag(fn, 2, I),
            varintEnc('_nested.length', I),
            `${I}for (let _i = 0; _i < _nested.length; _i++) buf.push(_nested[_i]);`,
            `  }`,
        ].join('\n');
    }
    if (typeName === 'string') {
        return [
            `  if (obj.${name} != null && obj.${name} !== "") {`,
            tag(fn, 2, I),
            `${I}const _enc = __te.encode(obj.${name});`,
            varintEnc('_enc.length', I),
            `${I}for (let _i = 0; _i < _enc.length; _i++) buf.push(_enc[_i]);`,
            `  }`,
        ].join('\n');
    }
    if (typeName === 'bytes') {
        return [
            `  if (obj.${name} != null && obj.${name}.length > 0) {`,
            tag(fn, 2, I),
            varintEnc(`obj.${name}.length`, I),
            `${I}for (let _i = 0; _i < obj.${name}.length; _i++) buf.push(obj.${name}[_i]);`,
            `  }`,
        ].join('\n');
    }
    if (typeName === 'bool') {
        const tb = computeTagBytes(fn, 0);
        return `  if (obj.${name} === true) {\n${I}buf.push(${[...tb, 1].join(', ')});\n  }`;
    }
    if (wireType === WireType.Varint) {
        return [
            `  if (obj.${name} != null && obj.${name} !== 0) {`,
            tag(fn, 0, I),
            varintEnc(`obj.${name} >>> 0`, I),
            `  }`,
        ].join('\n');
    }
    if (wireType === WireType.Bit32) {
        return [
            `  if (obj.${name} != null && obj.${name} !== 0) {`,
            tag(fn, 5, I),
            `${I}const _f = obj.${name};`,
            `${I}buf.push(_f & 0xff, (_f >> 8) & 0xff, (_f >> 16) & 0xff, (_f >> 24) & 0xff);`,
            `  }`,
        ].join('\n');
    }
    if (wireType === WireType.Bit64) {
        return [
            `  if (obj.${name} != null && obj.${name} !== 0) {`,
            tag(fn, 1, I),
            `${I}const _f = obj.${name};`,
            `${I}buf.push(_f & 0xff, (_f >> 8) & 0xff, (_f >> 16) & 0xff, (_f >> 24) & 0xff, 0, 0, 0, 0);`,
            `  }`,
        ].join('\n');
    }
    return '';
}

// ── repeated (unpacked, one tag per element) ──────────────────────────

function encRepeated(f: ProtobufField): string {
    const { name, fieldNumber: fn, typeName, wireType, isMessage } = f;
    const I = '      '; // indent inside for
    const arr = `obj.${name}`;
    const el = `${arr}[_ri]`;

    const body: string[] = [];

    if (isMessage) {
        body.push(
            `${I}const _nested = protobuf_encode_${typeName}(${el});`,
            tag(fn, 2, I),
            varintEnc('_nested.length', I),
            `${I}for (let _i = 0; _i < _nested.length; _i++) buf.push(_nested[_i]);`,
        );
    } else if (typeName === 'string') {
        body.push(
            tag(fn, 2, I),
            `${I}const _enc = __te.encode(${el});`,
            varintEnc('_enc.length', I),
            `${I}for (let _i = 0; _i < _enc.length; _i++) buf.push(_enc[_i]);`,
        );
    } else if (typeName === 'bytes') {
        body.push(
            tag(fn, 2, I),
            varintEnc(`${el}.length`, I),
            `${I}for (let _i = 0; _i < ${el}.length; _i++) buf.push(${el}[_i]);`,
        );
    } else if (typeName === 'bool') {
        const tb = computeTagBytes(fn, 0);
        body.push(`${I}buf.push(${[...tb].join(', ')}, ${el} ? 1 : 0);`);
    } else if (wireType === WireType.Varint) {
        body.push(tag(fn, 0, I), varintEnc(`${el} >>> 0`, I));
    } else if (wireType === WireType.Bit32) {
        body.push(
            tag(fn, 5, I),
            `${I}const _f = ${el};`,
            `${I}buf.push(_f & 0xff, (_f >> 8) & 0xff, (_f >> 16) & 0xff, (_f >> 24) & 0xff);`,
        );
    } else if (wireType === WireType.Bit64) {
        body.push(
            tag(fn, 1, I),
            `${I}const _f = ${el};`,
            `${I}buf.push(_f & 0xff, (_f >> 8) & 0xff, (_f >> 16) & 0xff, (_f >> 24) & 0xff, 0, 0, 0, 0);`,
        );
    }

    return [
        `  if (${arr} != null && ${arr}.length > 0) {`,
        `    for (let _ri = 0; _ri < ${arr}.length; _ri++) {`,
        ...body,
        `    }`,
        `  }`,
    ].join('\n');
}
