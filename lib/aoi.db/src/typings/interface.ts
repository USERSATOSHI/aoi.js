import { type CompressionFlag, type EncodingFlag, type MemTableEvent } from './enum.js';
import { type DataType, type HashFunction, type hex, type keyDataType, type PossibleKeyType, type str, type u32, type u8 } from './type';

export interface IDataNodeOptions {
	key: PossibleKeyType;
	value: unknown;
	keyType: DataType;
	valueType: DataType;
	offset: number;
	delete: boolean;
	length: number;
	timestamp: number;
	dataBuffer: Uint8Array;
}

export interface IMemTableEvents {
	[MemTableEvent.NeedsFlush]: () => void;
	[MemTableEvent.BufferOpened]: () => void;
}

/**
 * The options for the SSTable
 */
export interface ISSTableOptions<T extends keyDataType> {
	/** The block size */
	blockSize: u32;
	/** The size of the SSTable */
	size: u32;
	/** The path of the SSTable */
	path: str;
	/** The key data type */
	keyType: T;
	/** The value data type */
	valueType: DataType;
	/** the version of the SSTable */
	version: u8;
	/** The compression flag */
	compression: CompressionFlag;
	/** The encoding flag */
	encoding: EncodingFlag;
	/** custom hash Implementation for bloom Filter */
	customHash?: HashFunction<T>;
	
}

/**
 * The header of the SSTable
 */
export interface ISSTableHeader {
	/** The magic number of the SSTable */
	magicNumber: hex;
	/** The version of the SSTable */
	version: u8;
}

/**
 * The metadata of the SSTable
 */
export interface ISSTableMetadata {
	/** The header of the SSTable */
	keyType: PossibleKeyType;
	/** The value data type */
	valueType: DataType;
	/** The length of each key-value pair */
	kvLength: u32;
	/** Minumum key present in the SSTable */
	minKey: PossibleKeyType | undefined;
	/** Maximum key present in the SSTable */
	maxKey: PossibleKeyType | undefined;
}