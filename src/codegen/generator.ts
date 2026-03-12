import type { MessageRegistry } from '../ast/types.js';
import { generateEncoder } from './encoder.js';
import { generateDecoder } from './decoder.js';

/**
 * Generate all encode/decode function source code for a MessageRegistry.
 * Messages are already in topological order (dependencies first).
 */
export function generateCode(registry: MessageRegistry): string {
  const parts: string[] = [];
  for (const msg of registry.values()) {
    parts.push(generateEncoder(msg, registry));
    parts.push(generateDecoder(msg, registry));
  }
  return parts.join('\n');
}
