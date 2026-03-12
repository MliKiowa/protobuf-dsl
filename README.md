# protobuf-dsl

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
npm install protobuf-dsl
```

## 快速开始

**1. 在 `vite.config.ts` 中添加插件：**

```ts
import protobufVite from 'protobuf-dsl';

export default defineConfig({
  plugins: [protobufVite()],
});
```

**2. 在 `tsconfig.json` 中添加类型声明：**

```json
{
  "compilerOptions": {
    "types": ["protobuf-dsl/types"]
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

对比 `npm install -D @protobuf-ts/plugin protoc` 生成的 [protobuf-ts](https://github.com/timostamm/protobuf-ts) 代码，以及 [protobufjs](https://github.com/protobufjs/protobuf.js) 反射 API。benchmark 的 `.proto` 定义位于 `bench/proto/bench.proto`，生成入口是 `npm run bench:gen`，会先校验三者产出的 wire bytes 完全一致，再统计绝对吞吐率。下表统一以 `protobuf-dsl = 1x` 为基线，其他实现显示相对它慢了多少。

> Node v22.11.0 | Windows x64 | 每项测试 50 万次迭代

### 编码性能（ops/sec — 越高越好）

| 消息类型 | protobuf-dsl | protobuf-ts/protoc | protobufjs |
|---------|:-----------:|:------------------:|:---------:|
| 简单消息（1 个字段） | **36,959,559 (1x)** | 8,575,594 (4.31x slower) | 19,334,357 (1.91x slower) |
| 多字段消息（3 个字段） | **12,603,792 (1x)** | 1,655,076 (7.62x slower) | 4,267,854 (2.95x slower) |
| 嵌套消息 | **22,747,125 (1x)** | 3,056,270 (7.44x slower) | 10,330,835 (2.20x slower) |

### 解码性能（ops/sec — 越高越好）

| 消息类型 | protobuf-dsl | protobuf-ts/protoc | protobufjs |
|---------|:-----------:|:------------------:|:---------:|
| 简单消息（1 个字段） | **115,297,699 (1x)** | 8,981,159 (12.84x slower) | 33,670,941 (3.42x slower) |
| 多字段消息（3 个字段） | **10,629,071 (1x)** | 4,287,286 (2.48x slower) | 5,527,812 (1.92x slower) |
| 嵌套消息 | **64,363,318 (1x)** | 8,188,184 (7.86x slower) | 15,433,242 (4.17x slower) |

## 许可证

MIT
