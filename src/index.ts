import type { Plugin } from 'vite';
import { analyze, analyzeSource, typeNodeToMangledName } from './ast/analyzer.js';
import { generateCode } from './codegen/generator.js';
import { applyReplacements, replaceCallSites } from './transform/replacer.js';
import { resolveImports, type ParsedFileEntry } from './ast/import-resolver.js';

export default function protobufVitePlugin(): Plugin {
  const fileCache = new Map<string, ParsedFileEntry>();

  return {
    name: 'vite-plugin-protobuf',
    enforce: 'pre',

    transform(code, id) {
      if (!id.endsWith('.ts') || id.endsWith('.d.ts')) return null;

      const imported = resolveImports(code, id, fileCache);
      const { registry, callSites, sourceFile } = analyze(code, id, imported);
      if (registry.size === 0 && callSites.length === 0) return null;

      const generatedCode = generateCode(registry);
      const { transformedCode, hasReplacements } = applyReplacements(code, sourceFile, callSites, registry);
      if (!hasReplacements && generatedCode === '') return null;

      return { code: generatedCode + '\n' + transformedCode, map: null };
    },

    handleHotUpdate({ file }) {
      if (file.endsWith('.ts')) {
        fileCache.delete(file);
      }
    },
  };
}

export { analyze, analyzeSource, generateCode, replaceCallSites, applyReplacements, typeNodeToMangledName, resolveImports };
