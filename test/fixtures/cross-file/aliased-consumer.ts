import { protobuf_encode, protobuf_decode } from 'protobuf-fastdsl';
import type { UserMsg as AliasMsg } from './types';

const buf = protobuf_encode<AliasMsg>({ id: 42, name: 'alice' });
const decoded = protobuf_decode<AliasMsg>(buf);

export { };