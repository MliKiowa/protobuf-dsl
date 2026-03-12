// Protobuf wire format runtime helpers
// These functions are both used directly in tests AND exported as RUNTIME_SOURCE string for the virtual module.

export function encodeVarint(value: number, buf: number[]): void {
  value = value >>> 0; // ensure unsigned 32-bit
  while (value > 0x7f) {
    buf.push((value & 0x7f) | 0x80);
    value = value >>> 7;
  }
  buf.push(value & 0x7f);
}

export function decodeVarint(data: Uint8Array, offset: number): [number, number] {
  let result = 0;
  let shift = 0;
  let byte: number;
  do {
    byte = data[offset++];
    result |= (byte & 0x7f) << shift;
    shift += 7;
  } while (byte & 0x80);
  return [result >>> 0, offset];
}

export function writeTag(fieldNumber: number, wireType: number, buf: number[]): void {
  encodeVarint((fieldNumber << 3) | wireType, buf);
}

export function writeString(value: string, buf: number[]): void {
  const encoded = new TextEncoder().encode(value);
  encodeVarint(encoded.length, buf);
  for (let i = 0; i < encoded.length; i++) buf.push(encoded[i]);
}

export function readString(data: Uint8Array, offset: number, length: number): string {
  return new TextDecoder().decode(data.subarray(offset, offset + length));
}

export function writeBytes(value: Uint8Array, buf: number[]): void {
  encodeVarint(value.length, buf);
  for (let i = 0; i < value.length; i++) buf.push(value[i]);
}

export function skipField(data: Uint8Array, offset: number, wireType: number): number {
  switch (wireType) {
    case 0: { // varint
      while (data[offset] & 0x80) offset++;
      return offset + 1;
    }
    case 1: return offset + 8; // 64-bit
    case 2: { // length-delimited
      const [len, newOffset] = decodeVarint(data, offset);
      return newOffset + len;
    }
    case 5: return offset + 4; // 32-bit
    default:
      throw new Error(`Unknown wire type: ${wireType}`);
  }
}

// Pure function definitions — usable in new Function() tests
export const RUNTIME_FUNCTIONS = `
function __pb_encodeVarint(value, buf) {
  value = value >>> 0;
  while (value > 0x7f) {
    buf.push((value & 0x7f) | 0x80);
    value = value >>> 7;
  }
  buf.push(value & 0x7f);
}

function __pb_decodeVarint(data, offset) {
  let result = 0;
  let shift = 0;
  let byte;
  do {
    byte = data[offset++];
    result |= (byte & 0x7f) << shift;
    shift += 7;
  } while (byte & 0x80);
  return [result >>> 0, offset];
}

function __pb_writeTag(fieldNumber, wireType, buf) {
  __pb_encodeVarint((fieldNumber << 3) | wireType, buf);
}

function __pb_writeString(value, buf) {
  const encoded = new TextEncoder().encode(value);
  __pb_encodeVarint(encoded.length, buf);
  for (let i = 0; i < encoded.length; i++) buf.push(encoded[i]);
}

function __pb_readString(data, offset, length) {
  return new TextDecoder().decode(data.subarray(offset, offset + length));
}

function __pb_writeBytes(value, buf) {
  __pb_encodeVarint(value.length, buf);
  for (let i = 0; i < value.length; i++) buf.push(value[i]);
}

function __pb_skipField(data, offset, wireType) {
  switch (wireType) {
    case 0: while (data[offset] & 0x80) offset++; return offset + 1;
    case 1: return offset + 8;
    case 2: { const [len, o] = __pb_decodeVarint(data, offset); return o + len; }
    case 5: return offset + 4;
    default: throw new Error("Unknown wire type: " + wireType);
  }
}
`;

// The full runtime source injected into the virtual module (includes ESM export)
export const RUNTIME_SOURCE = RUNTIME_FUNCTIONS + `
export { __pb_encodeVarint, __pb_decodeVarint, __pb_writeTag, __pb_writeString, __pb_readString, __pb_writeBytes, __pb_skipField };
`;
