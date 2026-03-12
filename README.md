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
| `uint_64`, `int_64` | `number` | Varint |
| `sint_32`, `sint_64` | `number` | Varint |
| `bool` | `boolean` | Varint |
| `string` | `string` | LengthDelimited |
| `bytes` | `Uint8Array` | LengthDelimited |
| `float`, `fixed_32`, `sfixed_32` | `number` | 32-bit |
| `double`, `fixed_64`, `sfixed_64` | `number` | 64-bit |
| 嵌套消息 | interface | LengthDelimited |

字段标记：
- `pb<fieldNumber, Type>` — 单值字段
- `pb_repeated<fieldNumber, Type>` — 重复字段（→ `Type[]`）

## ⚡ 性能测试

对比 [protobufjs](https://github.com/protobufjs/protobuf.js) 反射 API。结果列出了每个库的绝对吞吐率及其相对于 protobufjs 的倍速。

> Node v22.11.0 | Windows x64 | 每项测试 50 万次迭代

### 编码性能（ops/sec — 越高越好）

| 消息类型 | protobuf-dsl | protobufjs | 比例（×protobufjs） |
|---------|:-----------:|:---------:|:------------------:|
| 简单消息（1 个字段） | 46,226,101 | 19,432,569 | 2.38× |
| 多字段消息（3 个字段） | 10,456,795 | 3,812,478 | 2.74× |
| 嵌套消息 | 24,381,086 | 9,917,408 | 2.46× |

### 解码性能（ops/sec — 越高越好）

| 消息类型 | protobuf-dsl | protobufjs | 比例（×protobufjs） |
|---------|:-----------:|:---------:|:------------------:|
| 简单消息（1 个字段） | **111,552,363** | 38,146,973 | 2.92× |
| 多字段消息（3 个字段） | 10,310,107 | 10,544,586 | 0.98× |
| 嵌套消息 | 67,347,324 | 18,022,499 | 3.74× |

### Wire 体积（字节 — 越小越好）

| 消息 | Protobuf |
|------|:---------:|
| `{ value: 12345 }` | **3 B** |
| `{ id, username, active }` | **22 B** |
| `{ inner: { value: 999 } }` | **5 B** |

## 📄 许可证

MIT