# protobuf-dsl

一个 Vite 插件，将 TypeScript protobuf 接口在构建时编译为**完全内联**、零依赖的编解码函数。

无 `.proto` 文件。无运行时库。无函数调用开销。只需 TypeScript 接口 → 确定化的二进制编解码代码。

## ✨ 特性

- **零运行时** — 所有 wire-format 逻辑在编译时内联
- **TypeScript 原生** — 用 `pb<N, Type>` 标记接口字段即可定义 schema
- **泛型单态化** — `Wrapper<Wrapper<string>>` → 自动生成具体编解码函数
- **重复字段** — `pb_repeated<N, Type>` 编译为 `Type[]`
- **编译期预计算 Tag** — 字段标签在编译时折叠为字面量字节
- **单遍编译** — 1 次解析 + 1 次 AST 遍历，零冗余

## 📦 安装

```bash
npm install protobuf-dsl
```

## 🚀 快速开始

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

## 🧬 泛型单态化

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

## 📐 支持的类型

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

对比 [protobufjs](https://github.com/protobufjs/protobuf.js)（反射 API）和原生 JSON。

> Node v22.11.0 | Windows x64 | 每项测试 50 万次迭代

### 编码性能（ops/sec — 越高越好）

| 消息类型 | protobuf-dsl | protobufjs | JSON.stringify |
|---------|:---:|:---:|:---:|
| 简单消息（1 个字段） | 15,290,894 | 18,114,564 | 11,939,358 |
| 多字段消息（3 个字段） | 2,472,346 | 4,055,065 | 6,727,737 |
| 嵌套消息 | 7,478,134 | 8,766,501 | 7,173,457 |

### 解码性能（ops/sec — 越高越好）

| 消息类型 | protobuf-dsl | protobufjs | JSON.parse |
|---------|:---:|:---:|:---:|
| 简单消息（1 个字段） | **98,336,152** | 38,521,692 | 5,954,500 |
| 多字段消息（3 个字段） | **10,011,954** | 9,308,110 | 3,701,779 |
| 嵌套消息 | **28,978,788** | 17,322,076 | 3,703,901 |

### Wire 体积（字节 — 越小越好）

| 消息 | Protobuf | JSON |
|------|:---:|:---:|
| `{ value: 12345 }` | **3 B** | 15 B |
| `{ id, username, active }` | **22 B** | 53 B |
| `{ inner: { value: 999 } }` | **5 B** | 23 B |

**核心结论：**
- 🟢 **解码速度比 protobufjs 快 2–16 倍**，比 JSON.parse 快 3–16 倍 — 完全内联代码的核心优势
- 🟡 编码速度与 protobufjs 处于同一量级（protobufjs 使用了预分配 Writer 缓冲区优化）
- 🟢 **wire 体积比 JSON 小 2–5 倍**

## 🏗️ 工作原理

```
源代码                         构建时                           输出
┌─────────────┐    ┌──────────────────────────┐    ┌──────────────────────┐
│ interface +  │    │ 1. 解析源码（1 次）       │    │ 完全内联的            │
│ pb<N, Type>  │───▶│ 2. 遍历 AST（1 次）      │───▶│ 编解码函数            │
│ + encode()   │    │ 3. 生成内联代码          │    │ 预计算的 tag 字面量    │
│   调用       │    │ 4. 字符串替换            │    │ 零运行时依赖          │
└─────────────┘    └──────────────────────────┘    └──────────────────────┘
```

编译流水线**零冗余**：单次源码解析、单次 AST 遍历（同时收集接口和记录调用点）、纯代码生成、基于位置的字符串替换。

## 📁 项目结构

```
src/
  ast/
    types.ts            类型定义 + wire 常量
    utils.ts            关键字检测、名称混淆
    collector.ts        接口字段提取（pb + pb_repeated）
    monomorphizer.ts    泛型类型实例化
    analyzer.ts         单遍编排器
  codegen/
    encoder.ts          内联编码器生成
    decoder.ts          内联解码器生成
    generator.ts        前置代码 + 编排
    wire.ts             Wire 格式测试辅助函数
  transform/
    replacer.ts         调用点重写
  index.ts              Vite 插件入口
```

## 📄 许可证

MIT