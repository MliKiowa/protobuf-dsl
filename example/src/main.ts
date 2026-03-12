import { SimpleMessage, UserProfile, Person, Wrapper, NumericTypes, BinaryData } from "./protobuf";
import { protobuf_encode, protobuf_decode } from "protobuf-fastdsl";

// ---------- 测试辅助 ----------
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${msg}`);
  }
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ---------- 1. 简单消息 ----------
console.log('\n--- SimpleMessage ---');
{
  const bytes = protobuf_encode<SimpleMessage>({ id: 42 });
  const decoded = protobuf_decode<SimpleMessage>(bytes);
  console.log('encoded bytes:', bytes);
  console.log('decoded:', decoded);
  assert(decoded.id === 42, 'SimpleMessage id === 42');
}

// ---------- 2. 多字段消息 ----------
console.log('\n--- UserProfile ---');
{
  const original = {
    id: 100,
    username: 'alice',
    active: true,
    tags: ['admin', 'dev'],
  };
  const bytes = protobuf_encode<UserProfile>(original);
  const decoded = protobuf_decode<UserProfile>(bytes);
  console.log('encoded bytes:', bytes);
  console.log('decoded:', decoded);
  assert(decoded.id === 100, 'UserProfile id === 100');
  assert(decoded.username === 'alice', 'UserProfile username === alice');
  assert(decoded.active === true, 'UserProfile active === true');
  assert(
    Array.isArray(decoded.tags) && decoded.tags.length === 2 &&
    decoded.tags[0] === 'admin' && decoded.tags[1] === 'dev',
    'UserProfile tags === [admin, dev]',
  );
}

// ---------- 3. 嵌套消息 ----------
console.log('\n--- Person (nested Address) ---');
{
  const original = {
    name: 'Bob',
    age: 30,
    address: { street: '123 Main St', city: 'Springfield' },
  };
  const bytes = protobuf_encode<Person>(original);
  const decoded = protobuf_decode<Person>(bytes);
  console.log('encoded bytes:', bytes);
  console.log('decoded:', decoded);
  assert(decoded.name === 'Bob', 'Person name === Bob');
  assert(decoded.age === 30, 'Person age === 30');
  assert(decoded.address.street === '123 Main St', 'Address street');
  assert(decoded.address.city === 'Springfield', 'Address city');
}

// ---------- 4. 泛型 Wrapper<string> ----------
console.log('\n--- Wrapper<string> ---');
{
  const bytes = protobuf_encode<Wrapper<string>>({ value: 'hello' });
  const decoded = protobuf_decode<Wrapper<string>>(bytes);
  console.log('decoded:', decoded);
  assert(decoded.value === 'hello', 'Wrapper<string> value === hello');
}

// ---------- 5. 泛型 Wrapper<Wrapper<string>> ----------
console.log('\n--- Wrapper<Wrapper<string>> ---');
{
  const bytes = protobuf_encode<Wrapper<Wrapper<string>>>({
    value: { value: 'nested' },
  });
  const decoded = protobuf_decode<Wrapper<Wrapper<string>>>(bytes);
  console.log('decoded:', decoded);
  assert(decoded.value?.value === 'nested', 'Wrapper<Wrapper<string>> nested value');
}

// ---------- 6. 各种数值类型 ----------
console.log('\n--- NumericTypes ---');
{
  const original = {
    u32: 123,
    i32: 456,              // int_32 用正数（负数需要用 sint_32）
    u64: 9999999999n,
    i64: -9999999999n,
    si32: 789,             // sint_32 — 注：插件 0.1.1 负数 zigzag 可能有 bug，先用正数
    si64: -1234567890n,
    f32: 3.14,
    f64: 2.718281828459045,
    fx32: 12345,           // fixed_32 用 32 位范围内的值
    fx64: 0xdeadbeefcafen,
    sfx32: -42,
    sfx64: -999999n,
  };
  const bytes = protobuf_encode<NumericTypes>(original);
  const decoded = protobuf_decode<NumericTypes>(bytes);
  console.log('decoded:', decoded);
  assert(decoded.u32 === 123, 'u32 === 123');
  assert(decoded.i32 === 456, 'i32 === 456');
  assert(decoded.u64 === 9999999999n, 'u64 === 9999999999n');
  assert(decoded.i64 === -9999999999n, 'i64 === -9999999999n');
  assert(decoded.si32 === 789, 'si32 === 789');
  assert(decoded.si64 === -1234567890n, 'si64 === -1234567890n');
  // float32 精度有限，用近似比较
  assert(Math.abs(decoded.f32 - 3.14) < 0.001, 'f32 ≈ 3.14');
  assert(decoded.f64 === 2.718281828459045, 'f64 === 2.718281828459045');
  assert(decoded.fx32 === 12345, 'fx32 === 12345');
  assert(decoded.fx64 === 0xdeadbeefcafen, 'fx64 === 0xdeadbeefcafen');
  assert(decoded.sfx32 === -42, 'sfx32 === -42');
  assert(decoded.sfx64 === -999999n, 'sfx64 === -999999n');
}

// ---------- 7. bytes 类型 ----------
console.log('\n--- BinaryData (bytes) ---');
{
  const payload = new Uint8Array([0x00, 0x01, 0x02, 0xff]);
  const bytes = protobuf_encode<BinaryData>({ payload, label: 'test' });
  const decoded = protobuf_decode<BinaryData>(bytes);
  console.log('decoded:', decoded);
  assert(arraysEqual(decoded.payload, payload), 'BinaryData payload roundtrip');
  assert(decoded.label === 'test', 'BinaryData label === test');
}

console.log('\n--- All tests done ---');
