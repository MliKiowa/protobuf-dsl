// ── Protobuf field markers ────────────────────────────────────────────
/** Marks a singular protobuf field: `name: pb<fieldNumber, Type>` */
type pb<_ProtoNumber extends number, Type> = Type;
/** Marks a repeated protobuf field: `ids: pb_repeated<fieldNumber, Type>` → Type[] */
type pb_repeated<_ProtoNumber extends number, Type> = Type[];

// ── Protobuf primitive types ──────────────────────────────────────────
type uint_32 = number;
type int_32 = number;
type uint_64 = bigint;
type int_64 = bigint;
type sint_32 = number;
type sint_64 = bigint;
type bool = boolean;
type float = number;
type double = number;
type fixed_32 = number;
type fixed_64 = bigint;
type sfixed_32 = number;
type sfixed_64 = bigint;
type bytes = Uint8Array;

// ── Encode / decode stubs (replaced at compile-time by the vite plugin) ──
declare function protobuf_encode<T>(params: T): Uint8Array;
declare function protobuf_decode<T>(data: Uint8Array): T;
