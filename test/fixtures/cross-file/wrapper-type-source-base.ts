import type { Wrapper } from './generic-types';
import { protobuf_encode } from 'protobuf-fastdsl';

export function encodeBoxed<T>(value: Wrapper<T>): Uint8Array {
    return protobuf_encode<Wrapper<T>>(value);
}