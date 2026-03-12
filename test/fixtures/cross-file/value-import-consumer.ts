import { SimpleMessage } from './protobuf';
import { protobuf_encode, protobuf_decode } from 'protobuf-fastdsl/runtime';

const bytes = protobuf_encode<SimpleMessage>({ id: 42 });
const decoded = protobuf_decode<SimpleMessage>(bytes);

export { };
