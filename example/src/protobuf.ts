import { bool, bytes, double, fixed_32, fixed_64, float, int_32, int_64, pb, pb_repeated, sfixed_32, sfixed_64, sint_32, sint_64, uint_32, uint_64 } from "protobuf-fastdsl";
export interface SimpleMessage {
    id: pb<1, uint_32>;
}

// ===== 多字段消息 =====
export interface UserProfile {
    id: pb<1, uint_32>;
    username: pb<2, string>;
    active: pb<3, bool>;
    tags: pb_repeated<4, string>;
}

// ===== 嵌套消息 =====
export interface Address {
    street: pb<1, string>;
    city: pb<2, string>;
}

export interface Person {
    name: pb<1, string>;
    age: pb<2, uint_32>;
    address: pb<3, Address>;
}

// ===== 泛型单态化 =====
export interface Wrapper<T> {
    value?: pb<1, T>;
}

// ===== 各种数值类型 =====
export interface NumericTypes {
    u32: pb<1, uint_32>;
    i32: pb<2, int_32>;
    u64: pb<3, uint_64>;
    i64: pb<4, int_64>;
    si32: pb<5, sint_32>;
    si64: pb<6, sint_64>;
    f32: pb<7, float>;
    f64: pb<8, double>;
    fx32: pb<9, fixed_32>;
    fx64: pb<10, fixed_64>;
    sfx32: pb<11, sfixed_32>;
    sfx64: pb<12, sfixed_64>;
}

// ===== bytes 类型 =====
export interface BinaryData {
    payload: pb<1, bytes>;
    label: pb<2, string>;
}