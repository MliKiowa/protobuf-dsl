import type { Plugin } from 'vite';
import { analyzeSource, typeNodeToMangledName } from './ast/analyzer.js';
import { generateCode } from './codegen/generator.js';
import { replaceCallSites } from './transform/replacer.js';

export default function protobufVitePlugin(): Plugin {
  return {
    name: 'vite-plugin-protobuf',
    enforce: 'pre',

    transform(code, id) {
      if (!id.endsWith('.ts') || id.endsWith('.d.ts')) return null;

      const registry = analyzeSource(code, id);
      if (registry.size === 0) return null;

      const generatedCode = generateCode(registry);
      const { transformedCode, hasReplacements } = replaceCallSites(code, registry);
      if (!hasReplacements && generatedCode === '') return null;

      // Generated code is fully self-contained — no runtime import needed
      return { code: generatedCode + '\n' + transformedCode, map: null };
    },
  };
}

export { analyzeSource, generateCode, replaceCallSites, typeNodeToMangledName };
