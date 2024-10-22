import { DataType, dataTypeMaxMin } from '../typings/enum.js';
import {
	type valueType,
	type DataType as DType,
	type u32,
	type str,
} from '../typings/type.js';
import AoiDBError from './error.js';
import NyaDBError from './error.js';

/**
 * Convert data type to enum
 * @param dataType - The data type
 * @returns The enum value
 *
 * @example
 * ```ts
 * dataTypeToEnum('u32'); // DataType.U32
 * ```
 */
export function dataTypeToEnum(dataType: DType): DataType {
	if (dataType.startsWith('str:')) {
		return DataType.Str;
	}

	switch (dataType) {
		case 'u8':
			return DataType.U8;
		case 'u16':
			return DataType.U16;
		case 'u32':
			return DataType.U32;
		case 'u64':
			return DataType.U64;
		case 'i8':
			return DataType.I8;
		case 'i16':
			return DataType.I16;
		case 'i32':
			return DataType.I32;
		case 'i64':
			return DataType.I64;
		case 'f32':
			return DataType.F32;
		case 'f64':
			return DataType.F64;
		case 'bool':
			return DataType.Bool;
		default: {
			throw new Error('default case');
		}
	}
}

/**
 * Convert enum to data type
 * @param enumValue - The enum value
 * @param keyLength - The key length
 * @returns The data type
 *
 * @example
 * ```ts
 * enumToDataType(DataType.Str, 10); // 'str:10'
 * ```
 */
export function enumToDataType(enumValue: DataType, keyLength?: u32): DType {
	switch (enumValue) {
		case DataType.Str:
			return `str:${keyLength!}`;
		case DataType.U8:
			return 'u8';
		case DataType.U16:
			return 'u16';
		case DataType.U32:
			return 'u32';
		case DataType.U64:
			return 'u64';
		case DataType.I8:
			return 'i8';
		case DataType.I16:
			return 'i16';
		case DataType.I32:
			return 'i32';
		case DataType.I64:
			return 'i64';
		case DataType.F32:
			return 'f32';
		case DataType.F64:
			return 'f64';
		case DataType.Bool:
			return 'bool';
	}
}

/**
 * Get the byte length of the data type
 * @param dataType - The data type
 * @returns The byte length of the data type
 *
 * @example
 * ```ts
 * dataTypeToByteLength('u32'); // 4
 * ```
 */
export function dataTypeToByteLength(dataType: DType): u32 {
	if (dataType.startsWith('str:')) {
		return parseInt(dataType.split(':')[1]);
	}

	switch (dataType) {
		case 'u8':
		case 'i8':
		case 'bool':
			return 1;
		case 'u16':
		case 'i16':
			return 2;
		case 'u32':
		case 'i32':
		case 'f32':
			return 4;
		case 'u64':
		case 'i64':
		case 'f64':
			return 8;
		default:
			throw AoiDBError.DatabaseTypeError(
				`Invalid data type: ${dataType}`,
			);
	}
}

/**
 * Get the value of the data type
 * @param buffer - The buffer
 * @param dataType - The data type
 * @returns The value of the data type
 *
 * @example
 * ```ts
 * dataTypeToValue(new Uint8Array([1, 0, 0, 0]), 'u32'); // 1
 * ```
 *
 * @remarks
 * This function treats the buffer as little endian
 */
export function dataTypeToValue(
	buffer: Uint8Array,
	dataType: DType,
): valueType {
	if (dataType.startsWith('str:')) {
		return Buffer.from(buffer).toString('utf-8');
	}
	// we store in little endian

	const toSigned = (value: number, bits: number) => {
		const signBit = 1 << (bits - 1);
		return value & signBit ? value - (1 << bits) : value;
	};

	switch (dataType) {
		case 'u8':
			return buffer[0];
		case 'i8':
			return toSigned(buffer[0], 8);
		case 'bool':
			return buffer[0] === 1;
		case 'u16':
			return buffer[0] | (buffer[1] << 8);
		case 'i16':
			return toSigned(buffer[0] | (buffer[1] << 8), 16);
		case 'u32':
			return (
				buffer[0] +
				(buffer[1] << 8) +
				(buffer[2] << 16) +
				buffer[3] * 0x1000000
			);
		case 'i32':
			return toSigned(
				buffer[0] +
					(buffer[1] << 8) +
					(buffer[2] << 16) +
					buffer[3] * 0x1000000,
				32,
			);
		case 'f32':
			return new DataView(buffer.buffer).getFloat32(0, true);
		case 'u64':
			return (
				BigInt(buffer[0]) |
				(BigInt(buffer[1]) << 8n) |
				(BigInt(buffer[2]) << 16n) |
				(BigInt(buffer[3]) << 24n) |
				(BigInt(buffer[4]) << 32n) |
				(BigInt(buffer[5]) << 40n) |
				(BigInt(buffer[6]) << 48n) |
				(BigInt(buffer[7]) << 56n)
			);
		case 'i64':
			const u64 =
				BigInt(buffer[0]) |
				(BigInt(buffer[1]) << 8n) |
				(BigInt(buffer[2]) << 16n) |
				(BigInt(buffer[3]) << 24n) |
				(BigInt(buffer[4]) << 32n) |
				(BigInt(buffer[5]) << 40n) |
				(BigInt(buffer[6]) << 48n) |
				(BigInt(buffer[7]) << 56n);
			return u64 >= 1n << 63n ? u64 - (1n << 64n) : u64;
		case 'f64':
			return new DataView(buffer.buffer).getFloat64(0, true);
		default:
			throw AoiDBError.DatabaseTypeError(`Invalid data type: ${dataType}`);
	}
}

/**
 * Convert value to data type
 * @param input - The input value
 * @param type - The data type
 * @returns the Uint8Array of the value
 *
 * @example
 * ```ts
 * valueToDataType(1, 'u32'); // new Uint8Array([1, 0, 0, 0])
 * ```
 */
export function valueToDataType(input: valueType, type: DType): Uint8Array {
	if (type.startsWith('str:')) {
		return new TextEncoder().encode(input as string);
	} else {
		const num = input as number;
		switch (type) {
			case 'i8':
			case 'u8':
			case 'bool':
				return new Uint8Array([num & 0xff]);

			case 'i16':
			case 'u16':
				return new Uint8Array([num & 0xff, (num >> 8) & 0xff]);

			case 'u32':
			case 'i32':
				return new Uint8Array([
					num & 0xff,
					(num >> 8) & 0xff,
					(num >> 16) & 0xff,
					(num >> 24) & 0xff,
				]);

			case 'u64':
			case 'i64':
				return new Uint8Array([
					num & 0xff,
					(num >> 8) & 0xff,
					(num >> 16) & 0xff,
					(num >> 24) & 0xff,
					(num >> 32) & 0xff,
					(num >> 40) & 0xff,
					(num >> 48) & 0xff,
					(num >> 56) & 0xff,
				]);

			case 'f32':
				return new Uint8Array(new Float32Array([num]).buffer);

			case 'f64':
				return new Uint8Array(new Float64Array([num]).buffer);

			default:
				throw AoiDBError.DatabaseTypeError(`Invalid data type: ${type}`);
		}
	}
}

/**
 * Convert timestamp to Uint8Array in little endian
 * @param timestampInMs - The timestamp in milliseconds
 * @returns The Uint8Array of the timestamp
 *
 * @example
 * ```ts
 * timestampToUint8ArrayLE(Date.now()); // new Uint8Array(8)
 * ```
 */
export function timestampToUint8ArrayLE(timestampInMs: number) {
	// Special case for zero
	if (timestampInMs === 0) {
		return new Uint8Array(8);
	}

	const exponent = Math.floor(Math.log2(timestampInMs));
	const mantissa = timestampInMs / Math.pow(2, exponent) - 1;

	const biasedExponent = exponent + 1023;

	const mantissaHigh = Math.floor(mantissa * Math.pow(2, 20));
	const mantissaLow = Math.floor(
		(mantissa * Math.pow(2, 52)) % Math.pow(2, 32),
	);

	const highBits = (biasedExponent << 20) | mantissaHigh;
	const lowBits = mantissaLow;

	return [
		lowBits & 0xff,
		(lowBits >> 8) & 0xff,
		(lowBits >> 16) & 0xff,
		(lowBits >> 24) & 0xff,
		highBits & 0xff,
		(highBits >> 8) & 0xff,
		(highBits >> 16) & 0xff,
		(highBits >> 24) & 0xff,
	];
}

export function stringToValue(string: str, type: DType): valueType {
	if (type.startsWith('str:')) {
		return string;
	}

	switch (type) {
		case 'u8':
		case 'u16':
		case 'u32':
		case 'i8':
		case 'i16':
		case 'i32':
			return parseInt(string);
		case 'u64':
		case 'i64':
			return BigInt(string);
		case 'f32':
		case 'f64':
			return parseFloat(string);
		case 'bool':
			return string === 'true';
		default:
			throw AoiDBError.DatabaseTypeError(`Invalid data type: ${type}`);
	}
}
