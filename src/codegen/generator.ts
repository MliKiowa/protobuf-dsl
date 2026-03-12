import type { MessageRegistry } from '../ast/types.js';
import { generateEncoder } from './encoder.js';
import { generateDecoder } from './decoder.js';

/** Shared preamble: TextEncoder/TextDecoder instances used by string encode/decode. */
const CODEGEN_PREAMBLE = `const __te = new TextEncoder();\nconst __td = new TextDecoder();`;

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
