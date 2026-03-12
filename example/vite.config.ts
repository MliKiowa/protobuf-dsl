import { defineConfig } from 'vite';
import protobufVite from 'protobuf-fastdsl/vite';

export default defineConfig({
  plugins: [protobufVite()],
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['es'],
      fileName: 'main',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
      },
    },
    target: 'node18',
    minify: false,
  },
});
