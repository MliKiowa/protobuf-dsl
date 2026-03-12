import type { Plugin } from 'vite';
import { analyze, analyzeSource, typeNodeToMangledName } from './ast/analyzer.js';
import { generateCode } from './codegen/generator.js';
import { applyReplacements, replaceCallSites } from './transform/replacer.js';

export default function protobufVitePlugin(): Plugin {
  return {
    name: 'vite-plugin-protobuf',
    enforce: 'pre',

    transform(code, id) {
      if (!id.endsWith('.ts') || id.endsWith('.d.ts')) return null;

      // Single parse + single walk — zero redundancy
      const { registry, callSites, sourceFile } = analyze(code, id);
      if (registry.size === 0) return null;

      const generatedCode = generateCode(registry);
      const { transformedCode, hasReplacements } = applyReplacements(code, sourceFile, callSites, registry);
      if (!hasReplacements && generatedCode === '') return null;

      return { code: generatedCode + '\n' + transformedCode, map: null };
    },
  };
}

export { analyze, analyzeSource, generateCode, replaceCallSites, applyReplacements, typeNodeToMangledName };
