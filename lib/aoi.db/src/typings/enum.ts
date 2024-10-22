export enum CompressionFlag {
	None,
	Gzip,
	Lz4,
	Zstd,
}

export enum EncodingFlag {
	None,
	Huffman,
	RLE,
	LZW,
}

export enum DataType {
	Str,
	I8,
	I16,
	I32,
	I64,
	U8,
	U16,
	U32,
	U64,
	F32,
	F64,
	Bool,
}

export const dataTypeMaxMin = {
	StrMax: 65535,
	StrMin: 0,
	I8Max: 127,
	I8Min: -128,
	I16Max: 32767,
	I16Min: -32768,
	I32Max: 2147483647,
	I32Min: -2147483648,
	I64Max: 9223372036854775807n,
	I64Min: -9223372036854775808n,
	U8Max: 255,
	U8Min: 0,
	U16Max: 65535,
	U16Min: 0,
	U32Max: 4294967295,
	U32Min: 0,
	U64Max: 18446744073709551615n,
	U64Min: 0n,
	F32Max: 3.4028234663852886e38,
	F32Min: -3.4028234663852886e38,
	F64Max: 1.7976931348623157e308,
	F64Min: -1.7976931348623157e308,
	BoolMax: 1,
	BoolMin: 0,
} as const;


export enum WALMethod {
	Append,
	Delete,
}

export enum MemTableEvent {
	NeedsFlush = 'needsFlush',
	BufferOpened = 'bufferOpened',
}