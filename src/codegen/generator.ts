import type { MessageRegistry } from '../ast/types.js';
import { generateEncoder } from './encoder.js';
import { generateDecoder } from './decoder.js';

/** Shared preamble: UTF-8 string helpers plus TextDecoder for decode. */
const CODEGEN_PREAMBLE = `const __td = new TextDecoder();
function __utf8Len(value) {
  let length = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) {
      length++;
      continue;
    }
    if (code < 0x800) {
      length += 2;
      continue;
    }
    if ((code & 0xfc00) === 0xd800) {
      if (i + 1 < value.length) {
        const next = value.charCodeAt(i + 1);
        if ((next & 0xfc00) === 0xdc00) {
          length += 4;
          i++;
          continue;
        }
      }
      length += 3;
      continue;
    }
    if ((code & 0xfc00) === 0xdc00) {
      length += 3;
      continue;
    }
    length += 3;
  }
  return length;
}
function __utf8Write(buf, offset, value) {
  for (let i = 0; i < value.length; i++) {
    let code = value.charCodeAt(i);
    if (code < 0x80) {
      buf[offset++] = code;
      continue;
    }
    if (code < 0x800) {
      buf[offset++] = 0xc0 | (code >> 6);
      buf[offset++] = 0x80 | (code & 0x3f);
      continue;
    }
    if ((code & 0xfc00) === 0xd800) {
      if (i + 1 < value.length) {
        const next = value.charCodeAt(i + 1);
        if ((next & 0xfc00) === 0xdc00) {
          const point = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
          buf[offset++] = 0xf0 | (point >> 18);
          buf[offset++] = 0x80 | ((point >> 12) & 0x3f);
          buf[offset++] = 0x80 | ((point >> 6) & 0x3f);
          buf[offset++] = 0x80 | (point & 0x3f);
          i++;
          continue;
        }
      }
      code = 0xfffd;
    } else if ((code & 0xfc00) === 0xdc00) {
      code = 0xfffd;
    }
    buf[offset++] = 0xe0 | (code >> 12);
    buf[offset++] = 0x80 | ((code >> 6) & 0x3f);
    buf[offset++] = 0x80 | (code & 0x3f);
  }
  return offset;
}`;

/**
 * Generate fully self-contained encode/decode source code.
 * No runtime imports needed — all wire-format logic is inlined.
 */
export function generateCode(registry: MessageRegistry): string {
  if (registry.size === 0) return '';
  const parts: string[] = [CODEGEN_PREAMBLE];
  for (const msg of registry.values()) {
    parts.push(generateEncoder(msg, registry));
    parts.push(generateDecoder(msg, registry));
  }
  return parts.join('\n');
}
