/**
 * Runtime fallback functions.
 * If the Vite plugin is active, calls to protobuf_encode/decode are replaced
 * at compile-time with generated type-specific functions.
 * If NOT transformed, these fallbacks throw to alert the developer.
 */
export function protobuf_encode<T>(_params: T): Uint8Array {
    throw new Error(
        'protobuf_encode<T>() was not transformed by the protobuf-fastdsl Vite plugin. ' +
        'Make sure protobufVitePlugin() is added to your vite.config.ts plugins array.',
    );
}

export function protobuf_decode<T>(_data: Uint8Array): T {
    throw new Error(
        'protobuf_decode<T>() was not transformed by the protobuf-fastdsl Vite plugin. ' +
        'Make sure protobufVitePlugin() is added to your vite.config.ts plugins array.',
    );
}
