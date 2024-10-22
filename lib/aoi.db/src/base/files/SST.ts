import fs from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';

import BlockCache from '@aoi.db/structures/BlockCache.js';
import SortedArray from '@aoi.db/structures/SortedArray.js';
import BloomFilter from '@aoi.db/core/BloomFilter.js';
import BufferNode from '@aoi.db/structures/BufferNode.js';
import AoiDBError from '@aoi.db/utils/error.js';
import type {
	bool,
	DataType,
	HashFunction,
	HashInputType,
	keyDataType,
	PossibleKeyType,
	u32,
} from '@aoi.db/typings/type.js';
import type {
	ISSTableHeader,
	ISSTableMetadata,
	ISSTableOptions,
} from '@aoi.db/typings/interface.js';
import type { DataType as EnumDataType } from '@aoi.db/typings/enum.js';

import { getCellAndHashCount, safe } from '@aoi.db/utils/helpers.js';
import {
	SST_BASE_BYTES,
	SST_HEADER,
	SST_METADATA,
	SST_SUPPORTED_VERSION,
	SST_TABLE_MAGIC_NUMBER,
} from '@aoi.db/utils/constants.js';
import {
	dataTypeToByteLength,
	dataTypeToEnum,
	dataTypeToValue,
	stringToValue,
} from '@aoi.db/utils/dataType.js';

export default class SST<T extends keyDataType> {
	blockCache: BlockCache;
	index: SortedArray<PossibleKeyType, u32>;
	bloomFilter: BloomFilter<T>;
	readonly customHashFn: HashFunction<T> | undefined;

	headerData!: ISSTableHeader;
	metaData!: ISSTableMetadata;
	readonly baseOptions = {
		version: 1,
	};

	readonly keyType!: T;
	readonly valueType!: DataType;
	readonly size: u32;
	readonly blockSize: u32;

	#fileHandle!: fs.FileHandle;
	#fileSize!: u32;
	#indexFile!: fs.FileHandle;
	#bloomFile!: fs.FileHandle;
	readonly #path!: string;

	constructor(options: ISSTableOptions<T>) {
		this.size = options.size;
		this.blockSize = options.blockSize;
		this.blockCache = new BlockCache(10);
		const [bloomSize, hashCount] = getCellAndHashCount(this.size, 0.01);
		this.bloomFilter = new BloomFilter<T>(
			bloomSize,
			hashCount,
			options.keyType,
			options.customHash,
		);
		this.index = new SortedArray(options.size / this.blockSize);
		this.#path = options.path;
		this.keyType = options.keyType;
		this.valueType = options.valueType;
		this.customHashFn = options.customHash;

		this.baseOptions.version = options.version;
	}

	/**
	 * Generate the initial File Data of the SSTable
	 * @internal
	 *
	 * @remarks
	 * the file data is for following format:
	 * ```ts
	 * Header Length (1 bytes)
	 * | Header                        |
	 * | +---------------------------+ |
	 * | | Magic Number (4 bytes)    | |
	 * | | Version Flag (1 byte)     | |
	 * | +---------------------------+ |
	 * Metadata Length (1 bytes)
	 * | Metadata                      |
	 * | +---------------------------+ |
	 * | | Value Data Type (1 byte)  | |
	 * | | Key Data Type (1 byte)    | |
	 * | | KVPair Length (1 byte)    | |
	 * | +---------------------------+ |
	 * | | STARTDELIMITER (4 bytes ) | key length (4 bytes) | value length (4 bytes) | key (key length) | value (value length) | timestamp (8 bytes) | deleted (1 byte) | ENDDELIMITER (4 bytes) | (repeat for KVS_PER_PAGE times) ||
	 * ```
	 */
	async _generateFileData() {
		const fileData = new Uint8Array(3 + SST_HEADER + SST_METADATA);

		let offset = 0;
		fileData[offset++] = SST_HEADER;

		// Header
		//* Magic Number
		fileData.set(SST_TABLE_MAGIC_NUMBER, offset);
		offset += 4;

		//* Version Flag
		fileData[offset++] = this.baseOptions.version;

		fileData[offset++] = SST_METADATA;

		// Metadata
		//* Value Data Type
		fileData[offset++] = dataTypeToEnum(this.valueType);
		fileData[offset++] = dataTypeToEnum(this.keyType);
		fileData[offset++] =
			SST_BASE_BYTES +
			dataTypeToByteLength(this.keyType) +
			dataTypeToByteLength(this.valueType);

		fileData[offset++] = 0x0a;

		await writeFile(this.#path, fileData, { flag: 'w' });

		this.headerData = {
			magicNumber: `0x${SST_TABLE_MAGIC_NUMBER[0].toString(
				16,
			)}${SST_TABLE_MAGIC_NUMBER[1].toString(
				16,
			)}${SST_TABLE_MAGIC_NUMBER[2].toString(
				16,
			)}${SST_TABLE_MAGIC_NUMBER[3].toString(16)}`,
			version: this.baseOptions.version,
		};

		this.metaData = {
			valueType: this.valueType,
			keyType: this.keyType,
			kvLength:
				SST_BASE_BYTES +
				dataTypeToByteLength(this.keyType) +
				dataTypeToByteLength(this.valueType),
			minKey: undefined,
			maxKey: undefined,
		};
	}

	/**
	 * Verify the SSTable file
	 * @internal
	 */
	async _verifyFile() {
		const headerLengthBuffer = new Uint8Array(1);
		await this.#fileHandle.read(headerLengthBuffer, 0, 1, 0);

		const headerLength = headerLengthBuffer[0];
		if (headerLength !== SST_HEADER) {
			throw AoiDBError.DatabaseInternalError(
				'Invalid SSTable Header Length',
			);
		}

		const headerBuffer = new Uint8Array(SST_HEADER);
		await this.#fileHandle.read(headerBuffer, 0, SST_HEADER, 1);

		const magicNumber = headerBuffer.slice(0, 4);
		const version = headerBuffer[4];

		if (
			magicNumber[0] !== SST_TABLE_MAGIC_NUMBER[0] ||
			magicNumber[1] !== SST_TABLE_MAGIC_NUMBER[1] ||
			magicNumber[2] !== SST_TABLE_MAGIC_NUMBER[2] ||
			magicNumber[3] !== SST_TABLE_MAGIC_NUMBER[3]
		) {
			throw AoiDBError.DatabaseInternalError(
				`Invalid SSTable file: ${
					this.#path
				}, expected magic number: ${SST_TABLE_MAGIC_NUMBER.join(
					',',
				)}, got: ${magicNumber.join(',')}`,
			);
		}

		if (!SST_SUPPORTED_VERSION.includes(version)) {
			throw AoiDBError.DatabaseInternalError(
				`Invalid SSTable version: ${version}. Supported versions: ${SST_SUPPORTED_VERSION.join(', ')}`,
			);
		}

		this.headerData = {
			magicNumber: `0x${magicNumber[0].toString(16)}${magicNumber[1].toString(16)}${magicNumber[2].toString(16)}${magicNumber[3].toString(16)}`,
			version,
		};

		const metadataLengthBuffer = new Uint8Array(1);
		await this.#fileHandle.read(metadataLengthBuffer, 0, 1, SST_HEADER + 1);

		const metadataLength = metadataLengthBuffer[0];

		if (metadataLength !== SST_METADATA) {
			throw AoiDBError.DatabaseInternalError(
				'Invalid SSTable Metadata Length',
			);
		}

		const metadataBuffer = new Uint8Array(SST_METADATA);
		await this.#fileHandle.read(
			metadataBuffer,
			0,
			SST_METADATA,
			SST_HEADER + 2,
		);

		const valueType = metadataBuffer[0] as EnumDataType;
		if (valueType !== dataTypeToEnum(this.valueType)) {
			throw AoiDBError.DatabaseInternalError(
				`Invalid Value Data Type: ${valueType}, expected: ${dataTypeToEnum(this.valueType)}`,
			);
		}

		const keyType = metadataBuffer[1] as EnumDataType;
		if (keyType !== dataTypeToEnum(this.keyType)) {
			throw AoiDBError.DatabaseInternalError(
				`Invalid Key Data Type: ${keyType}, expected: ${dataTypeToEnum(this.keyType)}`,
			);
		}

		const kvLength = metadataBuffer[2];
		if (
			kvLength !==
			SST_BASE_BYTES +
				dataTypeToByteLength(this.keyType) +
				dataTypeToByteLength(this.valueType)
		) {
			throw AoiDBError.DatabaseInternalError(
				`Invalid KVPair Length: ${kvLength}, expected: ${SST_BASE_BYTES + dataTypeToByteLength(this.keyType) + dataTypeToByteLength(this.valueType)}`,
			);
		}

		let maxKey: PossibleKeyType | undefined,
			minKey: PossibleKeyType | undefined;

		if (this.#fileSize > headerLength + metadataLength + 3) {
			const [err, data] = await safe(this._getMinAndMaxKeys(kvLength));

			if (err) {
				throw AoiDBError.DatabaseInternalError(
					`Failed to get min and max keys: ${err.message}`,
				);
			}

			[minKey, maxKey] = data;
		}

		this.metaData = {
			valueType: this.valueType,
			keyType: this.keyType,
			kvLength,
			minKey,
			maxKey,
		};
	}

	/**
	 * Get the minimum and maximum keys from the SSTable
	 * @param kvLength - The length of the key value pair
	 * @returns The minimum and maximum key of the SSTable
	 *
	 * @internal
	 */
	async _getMinAndMaxKeys(
		kvLength: u32,
	): Promise<[PossibleKeyType, PossibleKeyType]> {
		// we dont have indexes loaded yet so we will read kvlength of first and last part of file

		const kvBuffer = new Uint8Array(kvLength);

		// read the first buffer of file
		await this.#fileHandle.read(
			kvBuffer,
			0,
			kvLength,
			SST_HEADER + SST_METADATA + 3,
		);

		const minKey = this._getKeyFromUint8Array(kvBuffer);

		// read the last buffer of file
		await this.#fileHandle.read(
			kvBuffer,
			0,
			kvLength,
			this.#fileSize - kvLength,
		);

		const maxKey = this._getKeyFromUint8Array(kvBuffer);

		return [minKey, maxKey];
	}

	/**
	 * Get the key from the Uint8Array buffer
	 * @param buffer - The buffer to get the key from
	 * @returns The key
	 *
	 * @internal
	 */
	_getKeyFromUint8Array(buffer: Uint8Array): PossibleKeyType {
		const keyLength = dataTypeToByteLength(this.keyType);

		const keyBuffer = new Uint8Array(keyLength);
		const end = 12 + keyLength;
		for (let i = 12, j = 0; i < end; i++, j++) {
			keyBuffer[j] = buffer[i];
		}

		return dataTypeToValue(keyBuffer, this.keyType) as KeyType;
	}

	/**
	 * Binary search the key in the chunk
	 * @param chunk - the data block where the key is to be searched
	 * @param key - the key to be searched
	 * @returns The BufferNode if found, undefined otherwise
	 *
	 * @internal
	 */
	_binarySearch(
		chunk: Uint8Array,
		key: PossibleKeyType,
	): BufferNode | undefined {
		let start = 0,
			end = chunk.length / this.metaData.kvLength;
		let mid: u32 = 0;
		while (start <= end) {
			mid = start + ((end - start) >> 1);
			const offset = mid * this.metaData.kvLength;
			const currentKey = this._readKeyFromChunk(chunk, offset);

			if (currentKey === key) {
				return this._getKvFromChunk(chunk, offset);
			} else if (currentKey < key) {
				start = mid + 1;
			} else {
				end = mid - 1;
			}
		}

		return undefined;
	}

	/**
	 *	Build the indexes and bloom filter
	 * @param data	- The data to be indexed
	 * @param offset - The offset to start building the indexes
	 *
	 * @internal
	 */
	async _build(
		data: Uint8Array[],
		offset: u32 = SST_HEADER + SST_METADATA + 3,
	) {
		// build the indexes
		// build the bloom filter
		let baseOffset = offset;
		for (let i = 0; i < data.length; i += this.blockSize) {
			this.index.set(this._getKeyFromUint8Array(data[i]), baseOffset);
			baseOffset += this.blockSize * this.metaData.kvLength;
		}

		baseOffset = offset;

		for (const kv of data) {
			this.bloomFilter.add(
				this._getKeyFromUint8Array(kv) as HashInputType<T>,
			);
			baseOffset += this.metaData.kvLength;
		}

		await this.#indexFile.write(this.index.toString(), 0, 'utf-8');
		await this.#bloomFile.write(
			this.bloomFilter.bits.toArray(),
			0,
			this.bloomFilter.bits.toArray().byteLength,
			0,
		);
	}

	/**
	 * Write the data to the SSTable
	 * @param data - The data to be written
	 *
	 * @example
	 * ```ts
	 * await <SSTable>._write(data);
	 * ```
	 *
	 * @internal
	 */
	async _write(data: Uint8Array[]) {
		await this.#fileHandle.writev(data, SST_METADATA + SST_HEADER + 3);

		this.#fileSize = (await this.#fileHandle.stat()).size;

		this.metaData.minKey = this._getKeyFromUint8Array(data[0]);
		this.metaData.maxKey = this._getKeyFromUint8Array(
			data[data.length - 1],
		);

		this.blockCache.clear();
		this.index.clear();
		this.bloomFilter.clear();
		await this._build(data);
	}

	/**
	 * Append the data to the SSTable
	 * @param data - The data to be appended
	 *
	 * @internal
	 */
	async _append(data: Uint8Array[]) {
		const offset = this.#fileSize;
		await this.#fileHandle.writev(data, offset);

		const possibleMinKey = this._getKeyFromUint8Array(data[0]);
		const possibleMaxKey = this._getKeyFromUint8Array(
			data[data.length - 1],
		);

		if (this.metaData.minKey === undefined) {
			this.metaData.minKey = possibleMinKey;
		} else {
			if (possibleMinKey < this.metaData.minKey) {
				this.metaData.minKey = possibleMinKey;
			}
		}

		if (this.metaData.maxKey === undefined) {
			this.metaData.maxKey = possibleMaxKey;
		} else {
			if (possibleMaxKey > this.metaData.maxKey) {
				this.metaData.maxKey = possibleMaxKey;
			}
		}

		await this._build(data, offset);
	}

	/**
	 * Read the key from the chunk
	 * @param chunk - The chunk to read the key from
	 * @param offset - The offset to start reading the key from
	 * @returns The key
	 *
	 * @internal
	 */
	_readKeyFromChunk(chunk: Uint8Array, offset: u32): PossibleKeyType {
		const keyLength = dataTypeToByteLength(this.keyType);

		const keyBuffer = new Uint8Array(keyLength);
		const start = offset + 12;
		const end = start + keyLength;

		for (let i = start, j = 0; i < end; i++, j++) {
			keyBuffer[j] = chunk[i];
		}

		return dataTypeToValue(keyBuffer, this.keyType) as PossibleKeyType;
	}

	/**
	 * Get the key value pair from the chunk
	 * @param chunk - The chunk to get the key value pair from
	 * @param offset - The offset to start reading the key value pair from
	 * @returns The BufferNode
	 *
	 * @internal
	 */
	_getKvFromChunk(chunk: Uint8Array, offset: u32): BufferNode {
		const data = new Uint8Array(this.metaData.kvLength);
		const end = offset + this.metaData.kvLength;
		for (let i = offset, j = 0; i < end; i++, j++) {
			data[j] = chunk[i];
		}

		return new BufferNode(data, this.keyType, this.valueType, offset);
	}

	/**
	 * Open the SSTable
	 *
	 * @example
	 * ```ts
	 * await sstable.open();
	 * ```
	 */
	async open() {
		const [fileOpenError, fileHandle] = await safe(
			fs.open(this.#path, fs.constants.O_CREAT | fs.constants.O_RDWR),
		);
		if (fileOpenError) {
			throw AoiDBError.DatabaseInternalError(
				`Failed to open file ${this.#path}: ${fileOpenError.message}`,
			);
		}

		this.#fileHandle = fileHandle;

		const [fileStatError, stats] = await safe(this.#fileHandle.stat());
		if (fileStatError) {
			throw AoiDBError.DatabaseInternalError(
				`Failed to get stats for file ${this.#path}: ${fileStatError.message}`,
			);
		}

		this.#fileSize = stats.size;
		if (this.#fileSize === 0) {
			const [err] = await safe(this._generateFileData());
			if (err) {
				throw AoiDBError.DatabaseInternalError(
					`Failed to generate file data: ${err.message}`,
				);
			}

			this.#fileSize = SST_HEADER + SST_METADATA + 3;
		} else {
			const [err] = await safe(this._verifyFile());
			if (err) {
				throw AoiDBError.DatabaseInternalError(
					`Failed to verify file: ${err.message}`,
				);
			}
		}

		const [indexFileOpenError, indexFileHandle] = await safe(
			fs.open(
				this.#path.replace('.sst', '.idx'),
				fs.constants.O_CREAT | fs.constants.O_RDWR,
			),
		);
		if (indexFileOpenError) {
			throw AoiDBError.DatabaseInternalError(
				`Failed to open index file ${this.#path.replace('.sst', '.idx')}: ${indexFileOpenError.message}`,
			);
		}

		this.#indexFile = indexFileHandle;

		const [bloomFileOpenError, bloomFileHandle] = await safe(
			fs.open(
				this.#path.replace('.sst', '.bloom'),
				fs.constants.O_CREAT | fs.constants.O_RDWR,
			),
		);
		if (bloomFileOpenError) {
			throw AoiDBError.DatabaseInternalError(
				`Failed to open bloom filter file ${this.#path.replace('.sst', '.bloom')}: ${bloomFileOpenError.message}`,
			);
		}

		this.#bloomFile = bloomFileHandle;

		await this.#loadIndexes();
		await this.#loadBloomFilter();
	}

	/**
	 * Close the SSTable
	 *
	 * @example
	 * ```ts
	 * await <SSTable>.close();
	 * ```
	 */
	async close() {
		await this.#fileHandle.close();
	}

	/**
	 * Read the key from the SSTable
	 * @param key - The key to be read
	 * @returns The BufferNode if found, undefined otherwise
	 *
	 * @example
	 * ```ts
	 * await <SSTable>.readKey('key'); // BufferNode | undefined
	 * ```
	 */
	async readKey(key: PossibleKeyType): Promise<BufferNode | undefined> {
		const idx = this.index.justLE(key);
		if (!idx) return undefined;

		const offset = idx[1];

		let chunk: Uint8Array;

		if (this.blockCache.has(offset)) {
			chunk = this.blockCache.get(offset)!;
		} else {
			chunk = new Uint8Array(
				Math.min(this.blockSize, this.#fileSize - offset),
			);
			const [err] = await safe(
				this.#fileHandle.read(chunk, 0, chunk.length, offset),
			);
			if (err) {
				throw AoiDBError.DatabaseInternalError(
					`Failed to read chunk: ${err.message}`,
				);
			}

			this.blockCache.put(offset, chunk);
		}

		return this._binarySearch(chunk, key);
	}

	/**
	 * Read the first N keys from the SSTable
	 * @param count - The number of keys to be read
	 * @returns The BufferNode array
	 *
	 * @example
	 * ```ts
	 * await <SSTable>.readN(10); // BufferNode[]
	 * ```
	 */
	async readN(count: u32): Promise<BufferNode[]> {
		const actualCount = Math.min(count, this.size);

		const buffers = new Array<BufferNode>(actualCount);

		let offset = SST_HEADER + SST_METADATA + 3;
		for (let i = 0; i < actualCount; i++) {
			const dataBuffer = new Uint8Array(this.metaData.kvLength);
			await this.#fileHandle.read(
				dataBuffer,
				0,
				dataBuffer.length,
				offset,
			);

			buffers[i] = this._getKvFromChunk(dataBuffer, offset);
			offset += this.metaData.kvLength;
		}

		return buffers;
	}

	/**
	 * Read all the keys from the SSTable
	 * @returns The BufferNode array
	 *
	 * @example
	 * ```ts
	 * await <SSTable>.readAll(); // BufferNode[]
	 * ```
	 */
	async readAll(): Promise<BufferNode[]> {
		return this.readN(this.size);
	}

	/**
	 * Check if the SSTable may have the key using bloom filter
	 * @param key - The key to be checked
	 * @returns A boolean indicating if the SSTable may have the key
	 *
	 * @example
	 * ```ts
	 * await <SSTable>.mayHasKey('key'); // boolean
	 * ```
	 *
	 * @remarks
	 * This method is a probabilistic method and may return false positives but would never return false negatives
	 */
	mayHasKey(key: PossibleKeyType): bool {
		return this.bloomFilter.lookup(key as HashInputType<T>);
	}

	/**
	 * Check if the SSTable has the key
	 * @param key - The key to be checked
	 * @returns A boolean indicating if the SSTable has the key
	 *
	 * @example
	 * ```ts
	 * await <SSTable>.hasKey('key'); // boolean
	 * ```
	 *
	 * @remarks
	 * this method will garuntee if the key is present in the SSTable or not
	 */
	async hasKey(key: PossibleKeyType): Promise<bool> {
		if (this.index.has(key)) return true;

		const buffer = await this.readKey(key);
		return !!(buffer && !buffer.isDeleted());
	}

	/**
	 * Unlink the SSTable
	 */
	async unlink() {
		await this.#fileHandle.close();
		await this.#indexFile.close();
		await this.#bloomFile.close();

		await fs.unlink(this.#path);
		await fs.unlink(this.#path.replace('.sst', '.idx'));
		await fs.unlink(this.#path.replace('.sst', '.bloom'));
	}

	/**
	 * returns the path of the SSTable
	 */
	get path(): string {
		return this.#path;
	}

	/**
	 * Ping the SSTable
	 * @returns The time taken to ping the SSTable
	 */
	async ping() {
		const start = performance.now();
		const [err] = await safe(this.readKey(this.metaData.minKey!));
		if (err) {
			return -1;
		}
		
		return performance.now() - start;
	}

	/**
	 * Loads the indexes from the index file
	 */
	async #loadIndexes() {
		const [err, fileContent] = await safe(this.#indexFile.readFile());
		if (err) {
			throw AoiDBError.DatabaseInternalError(
				`Failed to read index file: ${err.message}`,
			);
		}

		const indexes = fileContent.toString().split(',');
		for (let i = 0; i < indexes.length; i += 2) {
			this.index.set(
				stringToValue(indexes[i], this.keyType) as keyDataType,
				parseInt(indexes[i + 1]),
			);
		}
	}

	/**
	 * Loads the bloom filter from the bloom filter file
	 */
	async #loadBloomFilter() {
		const [err, fileContent] = await safe(this.#bloomFile.readFile());
		if (err) {
			throw AoiDBError.DatabaseInternalError(
				`Failed to read bloom filter file: ${err.message}`,
			);
		}

		if (fileContent.length === 0) return;
		const bits = new Uint8Array(fileContent);
		this.bloomFilter.setBits(bits);
	}
}
