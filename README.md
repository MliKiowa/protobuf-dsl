# protobuf-fastdsl

一个 Vite 插件，将 TypeScript protobuf 接口在构建时编译为**完全内联**、零依赖的编解码函数。

无 `.proto` 文件。无运行时库。无函数调用开销。只需 TypeScript 接口 → 确定化的二进制编解码代码。

## 特性

- **零运行时** — 所有 wire-format 逻辑在编译时内联
- **TypeScript 原生** — 用 `pb<N, Type>` 标记接口字段即可定义 schema
- **泛型单态化** — `Wrapper<Wrapper<string>>` → 自动生成具体编解码函数
- **重复字段** — `pb_repeated<N, Type>` 编译为 `Type[]`
- **编译期预计算 Tag** — 字段标签在编译时折叠为字面量字节

## 安装

```bash
npm install protobuf-fastdsl
```

## 快速开始

**1. 在 `vite.config.ts` 中添加插件：**

```ts
import protobufVite from 'protobuf-fastdsl';

export default defineConfig({
  plugins: [protobufVite()],
});
```

**2. 在 `tsconfig.json` 中添加类型声明：**

```json
{
  "compilerOptions": {
    "types": ["protobuf-fastdsl/types"]
  }
}
```

**3. 用 TypeScript 接口定义 schema：**

```ts
interface UserProfile {
  id:       pb<1, uint_32>;
  username: pb<2, string>;
  active:   pb<3, bool>;
  tags:     pb_repeated<4, string>;
}
```

**4. 使用 `protobuf_encode` / `protobuf_decode`：**

```ts
const bytes = protobuf_encode<UserProfile>({
  id: 42,
  username: 'alice',
  active: true,
  tags: ['admin', 'dev'],
});

const user = protobuf_decode<UserProfile>(bytes);
// user.id === 42, user.tags === ['admin', 'dev']
```

构建时，插件会将上述代码转换为：

```js
// 预计算的 tag 字面量，内联 varint 循环，零函数调用
const bytes = protobuf_encode_UserProfile({ id: 42, ... });
const user = protobuf_decode_UserProfile(bytes);
```

## 泛型单态化

定义泛型 protobuf 模板，使用具体类型实例化：

```ts
interface Wrapper<T> {
  value?: pb<1, T>;
}

// 插件自动生成以下具体类型的编解码函数：
//   Wrapper__string  和  Wrapper__Wrapper__string
const data = protobuf_encode<Wrapper<Wrapper<string>>>({
  value: { value: 'hello' },
});
```

## 支持的类型

| Protobuf 类型 | TypeScript 类型 | Wire 类型 |
|---------------|-----------------|-----------|
| `uint_32`, `int_32` | `number` | Varint |
| `uint_64`, `int_64` | `bigint` | Varint |
| `sint_32` | `number` | Varint |
| `sint_64` | `bigint` | Varint |
| `bool` | `boolean` | Varint |
| `string` | `string` | LengthDelimited |
| `bytes` | `Uint8Array` | LengthDelimited |
| `float`, `fixed_32`, `sfixed_32` | `number` | 32-bit |
| `double` | `number` | 64-bit |
| `fixed_64`, `sfixed_64` | `bigint` | 64-bit |
| 嵌套消息 | interface | LengthDelimited |

字段标记：
- `pb<fieldNumber, Type>` — 单值字段
- `pb_repeated<fieldNumber, Type>` — 重复字段（→ `Type[]`）

说明：
- 所有 64 位整数类型在 TypeScript 中统一映射为 `bigint`

## ⚡ 性能测试

benchmark 的 `.proto` 定义位于 `bench/proto/bench.proto`，生成入口是 `npm run bench:gen`。脚本会先校验所有实现产出的 wire bytes 完全一致，再统计绝对吞吐率。下表统一以 `protobuf-fastdsl = 1x` 为基线，其他实现显示相对它慢了多少。

参与对比的实现：
- `protobuf-ts(protoc)` — `@protobuf-ts/plugin + protoc` 生成代码
- `protobuf-ts` — 手写 `MessageType` 反射运行时
- `protobufjs(static)` — `pbjs static-module` 从同一份 `.proto` 生成代码
- `protobufjs` — 反射 API
- `protobuf` — `google-protobuf + protoc-gen-js` 生成代码

> Node v22.11.0 | Windows x64 | 每项测试 50 万次迭代

### 编码性能（ops/sec — 越高越好）

| 消息类型 | protobuf-fastdsl | protobuf-ts(protoc) | protobuf-ts | protobufjs(static) | protobufjs | protobuf |
|---------|:-----------:|:-------------------:|:-----------:|:------------------:|:----------:|:--------:|
| 简单消息（1 个字段） | **35,782,016 (1x)** | 8,238,128 (4.34x slower) | 5,828,158 (6.14x slower) | 16,466,923 (2.17x slower) | 16,819,500 (2.13x slower) | 5,794,260 (6.18x slower) |
| 多字段消息（3 个字段） | **11,361,700 (1x)** | 1,767,940 (6.43x slower) | 1,394,561 (8.15x slower) | 4,481,491 (2.54x slower) | 4,240,911 (2.68x slower) | 1,609,704 (7.06x slower) |
| 嵌套消息 | **21,264,923 (1x)** | 2,815,065 (7.55x slower) | 2,019,035 (10.53x slower) | 10,287,198 (2.07x slower) | 9,902,049 (2.15x slower) | 2,365,296 (8.99x slower) |

### 解码性能（ops/sec — 越高越好）

| 消息类型 | protobuf-fastdsl | protobuf-ts(protoc) | protobuf-ts | protobufjs(static) | protobufjs | protobuf |
|---------|:-----------:|:-------------------:|:-----------:|:------------------:|:----------:|:--------:|
| 简单消息（1 个字段） | **99,577,790 (1x)** | 7,586,436 (13.13x slower) | 9,032,575 (11.02x slower) | 27,215,772 (3.66x slower) | 19,002,736 (5.24x slower) | 11,497,372 (8.66x slower) |
| 多字段消息（3 个字段） | **10,190,107 (1x)** | 3,891,478 (2.62x slower) | 3,219,789 (3.16x slower) | 5,141,816 (1.98x slower) | 4,893,718 (2.08x slower) | 3,606,205 (2.83x slower) |
| 嵌套消息 | **51,491,185 (1x)** | 8,376,444 (6.15x slower) | 6,033,801 (8.53x slower) | 11,922,077 (4.32x slower) | 13,326,794 (3.86x slower) | 3,148,311 (16.36x slower) |

## 许可证

MIT
