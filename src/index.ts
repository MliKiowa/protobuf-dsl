import type { Plugin } from 'vite';
import { analyzeSource, typeNodeToMangledName } from './ast/analyzer.js';
import { generateCode } from './codegen/generator.js';
import { RUNTIME_SOURCE, RUNTIME_FUNCTIONS } from './codegen/wire.js';
import { replaceCallSites } from './transform/replacer.js';

const VIRTUAL_MODULE_ID = 'virtual:protobuf-runtime';
const RESOLVED_VIRTUAL_ID = '\0virtual:protobuf-runtime';

export default function protobufVitePlugin(): Plugin {
  return {
    name: 'vite-plugin-protobuf',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID;
      return null;
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) return RUNTIME_SOURCE;
      return null;
    },

    transform(code, id) {
      if (!id.endsWith('.ts') || id.endsWith('.d.ts')) return null;

      const registry = analyzeSource(code, id);
      if (registry.size === 0) return null;

      const generatedCode = generateCode(registry);
      const { transformedCode, hasReplacements } = replaceCallSites(code, registry);
      if (!hasReplacements && generatedCode === '') return null;

      const runtimeImport = `import { __pb_encodeVarint, __pb_decodeVarint, __pb_writeTag, __pb_writeString, __pb_readString, __pb_writeBytes, __pb_skipField } from '${VIRTUAL_MODULE_ID}';\n`;
      return { code: runtimeImport + generatedCode + '\n' + transformedCode, map: null };
    },
  };
}

export { analyzeSource, generateCode, replaceCallSites, typeNodeToMangledName, RUNTIME_SOURCE, RUNTIME_FUNCTIONS };
