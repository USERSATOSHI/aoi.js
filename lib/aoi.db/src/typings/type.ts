/* eslint-disable @typescript-eslint/no-duplicate-type-constituents */
/* eslint-disable @typescript-eslint/naming-convention */
export type Safe<T> = [Error, undefined] | [undefined, T];
export type DeepRequired<T> = {
	[P in keyof T]-?: DeepRequired<T[P]>;
};

export type DataType =
	| `str:${number}`
	| 'u8'
	| 'i8'
	| 'u16'
	| 'i16'
	| 'u32'
	| 'i32'
	| 'u64'
	| 'i64'
	| 'f32'
	| 'f64'
	| 'bool';

export type keyDataType =
	| `str:${u32}`
	| 'i64'
	| 'u64'
	| 'i32'
	| 'u32'
	| 'i16'
	| 'u16'
	| 'i8'
	| 'u8';

export type hex = `0x${str}`;

export type TypedArray =
	| Uint8Array
	| Int8Array
	| Uint16Array
	| Int16Array
	| Uint32Array
	| Int32Array
	| BigUint64Array
	| BigInt64Array
	| Float32Array
	| Float64Array;

export type u32 = number;
export type u64 = bigint;
export type i32 = number;
export type i64 = bigint;
export type f32 = number;
export type f64 = number;
export type str = string;
export type bool = boolean;
export type u8 = number;
export type i8 = number;
export type u16 = number;
export type i16 = number;

export type signedInt = i8 | i16 | i32 ;
export type float = f32 | f64;
export type unsignedInt = u8 | u16 | u32 ;
export type PossibleKeyType = string | number | bigint;
export type valueType = u32 | i32 | u64 | i64 | f32 | f64 | bool | str | u8 | i8 | u16 | i16;

export type HashFunction<T extends keyDataType> = (
	input: HashInputType<T>,
	seed: u32,
) => u32;

export type HashInputType<T extends keyDataType> = T extends `str:${u32}`
	? str
	: T extends 'i64'
		? i64
		: T extends 'u64'
			? u64
			: T extends 'i32'
				? i32
				: T extends 'u32'
					? u32
					: T extends 'i16'
						? i16
						: T extends 'u16'
							? u16
							: T extends 'i8'
								? i8
								: T extends 'u8'
									? u8
									: never;
