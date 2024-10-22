import { WALMethod, type DataType } from '@aoi.db/typings/enum.js';
import { type IDataNodeOptions } from '@aoi.db/typings/interface';
import {
	type PossibleKeyType,
	type DataType as DType,
} from '@aoi.db/typings/type.js';
import {
	SST_DATA_START_DELIMITER,
	SST_DATA_END_DELIMITER,
	SST_BASE_BYTES,
	WAL_BASE_SIZE,
} from '@aoi.db/utils/constants.js';
import {
	dataTypeToByteLength,
	timestampToUint8ArrayLE,
	dataTypeToValue,
	dataTypeToEnum,
	enumToDataType,
} from '@aoi.db/utils/dataType.js';

export default class DataNode {
	static Empty() {
		return new DataNode({
			key: 'null',
			value: null,
			keyType: 'u8',
			valueType: 'u8',
			offset: -1,
			delete: false,
			length: 56,
			timestamp: Date.now(),
			dataBuffer: new Uint8Array(0),
		});
	}

	static deletedNode(key: PossibleKeyType, keyType: DType, valueType: DType) {
		return new DataNode({
			key,
			value: valueType.startsWith('str:')
				? '1'
				: valueType === 'u64' || valueType === 'i64'
					? 1n
					: 1,
			keyType,
			valueType: valueType,
			offset: -1,
			delete: true,
			length:
				SST_BASE_BYTES +
				dataTypeToByteLength(keyType) +
				dataTypeToByteLength(valueType),
			timestamp: Date.now(),
			dataBuffer: new Uint8Array(0),
		});
	}

	static fromUint8Array(
		line: Uint8Array,
		offset: number,
		options: { keyDataType: DType; dataType: DType },
	) {
		const kvPairLengthTotal = line.byteLength;
		const { keyDataType, dataType } = options;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		let offset_ = 4;

		const dataView = new DataView(line.buffer);
		const keyTypeLength = dataView.getUint32(offset_, true);
		offset_ += 4;

		const valueTypeLength = dataView.getUint32(offset_, true);
		offset_ += 4;

		const keyBuffer = line.slice(offset_, offset_ + keyTypeLength);
		offset_ += keyTypeLength;

		const valueBuffer = line.slice(offset_, offset_ + valueTypeLength);
		offset_ += valueTypeLength;

		const timestamp = dataView.getFloat64(offset_, true);
		offset_ += 8;

		const deleted = line[offset_++] === 0x01;

		const actualKey = dataTypeToValue(
			keyBuffer,
			keyDataType,
		) as PossibleKeyType;
		const actualValue = dataTypeToValue(valueBuffer, dataType);

		const dataBuffer = new Uint8Array(
			keyBuffer.length + valueBuffer.length,
		);
		dataBuffer.set(keyBuffer);
		dataBuffer.set(valueBuffer, keyBuffer.length);

		return new DataNode({
			key: actualKey,
			value: actualValue,
			keyType: keyDataType,
			valueType: dataType,
			offset,
			delete: deleted,
			length: kvPairLengthTotal,
			timestamp,
			dataBuffer,
		});
	}

	static fromWAL(line: Uint8Array) {
		const dataView = new DataView(line.buffer);
		let offset = 6;

		const keyLength = dataView.getUint32(offset, true);
		offset += 4;
		const valueLength = dataView.getUint32(offset, true);
		offset += 4;

		const dataBuffer = line.slice(offset, offset + keyLength + valueLength);
		offset += keyLength + valueLength;

		const timestamp = dataView.getFloat64(offset, true);
		offset += 8;

		const method = line[offset++];

		const keyType = enumToDataType(line[4], keyLength);
		const valueType = enumToDataType(line[5], valueLength);

		const key = dataTypeToValue(
			dataBuffer.slice(0, keyLength),
			keyType,
		) as PossibleKeyType;
		const value = dataTypeToValue(dataBuffer.slice(keyLength), valueType);

		return new DataNode({
			key: key,
			value: value,
			keyType: keyType,
			valueType: valueType,
			offset: -1,
			delete: (Number(method) as WALMethod) === WALMethod.Delete,
			length:
				SST_BASE_BYTES +
				dataTypeToByteLength(keyType) +
				dataTypeToByteLength(valueType),
			timestamp: Number(timestamp),
			dataBuffer,
		});
	}

	readonly #key: PossibleKeyType;
	readonly #value: unknown;
	readonly #keyType: DType;
	readonly #valueType: DType;
	readonly #offset: number = 0;
	#delete: boolean;
	readonly #length: number;
	readonly #timestamp: number;
	readonly #dataBuffer: Uint8Array;
	constructor(options: IDataNodeOptions) {
		this.#key = options.key;
		this.#value = options.value;
		this.#keyType = options.keyType;
		this.#valueType = options.valueType;
		this.#offset = options.offset;
		this.#delete = options.delete;
		this.#length = options.length;
		this.#timestamp = options.timestamp;
		this.#dataBuffer = options.dataBuffer;
	}

	toUint8Array() {
		const buffer = new Uint8Array(this.#length);
		const keyTypeLength = dataTypeToByteLength(this.#keyType);
		const valueTypeLength = dataTypeToByteLength(this.#valueType);
		let offset = 0;

		// Set the start delimiter
		buffer[offset++] = SST_DATA_START_DELIMITER[0];
		buffer[offset++] = SST_DATA_START_DELIMITER[1];
		buffer[offset++] = SST_DATA_START_DELIMITER[2];
		buffer[offset++] = SST_DATA_START_DELIMITER[3];

		//convert keyLength from u32 to u8[4] - if u are wondering why i did this, because this added one more 0 to ops :)
		let highestbits = keyTypeLength >> 24;
		let highbits = (keyTypeLength >> 16) & 0xff;
		let lowbits = (keyTypeLength >> 8) & 0xff;
		let lowestbits = keyTypeLength & 0xff;
		buffer[offset++] = lowestbits;
		buffer[offset++] = lowbits;
		buffer[offset++] = highbits;
		buffer[offset++] = highestbits;

		//convert valueLength from u32 to u8[4]
		highestbits = valueTypeLength >> 24;
		highbits = (valueTypeLength >> 16) & 0xff;
		lowbits = (valueTypeLength >> 8) & 0xff;
		lowestbits = valueTypeLength & 0xff;
		buffer[offset++] = lowestbits;
		buffer[offset++] = lowbits;
		buffer[offset++] = highbits;
		buffer[offset++] = highestbits;

		// Set key data
		for (const byte of this.#dataBuffer) {
			buffer[offset++] = byte;
		}

		// Set timestamp
		const timestampu8s = timestampToUint8ArrayLE(this.#timestamp);
		buffer[offset++] = timestampu8s[0];
		buffer[offset++] = timestampu8s[1];
		buffer[offset++] = timestampu8s[2];
		buffer[offset++] = timestampu8s[3];
		buffer[offset++] = timestampu8s[4];
		buffer[offset++] = timestampu8s[5];
		buffer[offset++] = timestampu8s[6];
		buffer[offset++] = timestampu8s[7];

		// Set delete flag
		buffer[offset++] = this.#delete ? 0x01 : 0x00;

		// Set the end delimiter
		buffer[offset++] = SST_DATA_END_DELIMITER[0];
		buffer[offset++] = SST_DATA_END_DELIMITER[1];
		buffer[offset++] = SST_DATA_END_DELIMITER[2];
		buffer[offset++] = SST_DATA_END_DELIMITER[3];

		return buffer;
	}

	toWAL() {
		const keyLen = dataTypeToByteLength(this.keyType);
		const valueLen = dataTypeToByteLength(this.valueType);
		const walBuffer = new Uint8Array(WAL_BASE_SIZE + keyLen + valueLen);
		let offset = 0;

		walBuffer[offset++] = dataTypeToEnum(this.keyType);
		walBuffer[offset++] = dataTypeToEnum(this.valueType);

		// set keylength
		let highestbits = keyLen >> 24;
		let highbits = (keyLen >> 16) & 0xff;
		let lowbits = (keyLen >> 8) & 0xff;
		let lowestbits = keyLen & 0xff;

		walBuffer[offset++] = lowestbits;
		walBuffer[offset++] = lowbits;
		walBuffer[offset++] = highbits;
		walBuffer[offset++] = highestbits;

		// set valuelength
		highestbits = valueLen >> 24;
		highbits = (valueLen >> 16) & 0xff;
		lowbits = (valueLen >> 8) & 0xff;
		lowestbits = valueLen & 0xff;

		walBuffer[offset++] = lowestbits;
		walBuffer[offset++] = lowbits;
		walBuffer[offset++] = highbits;
		walBuffer[offset++] = highestbits;

		for (const byte of this.#dataBuffer) {
			walBuffer[offset++] = byte;
		}

		const timestampu8s = timestampToUint8ArrayLE(this.#timestamp);
		walBuffer[offset++] = timestampu8s[0];
		walBuffer[offset++] = timestampu8s[1];
		walBuffer[offset++] = timestampu8s[2];
		walBuffer[offset++] = timestampu8s[3];
		walBuffer[offset++] = timestampu8s[4];
		walBuffer[offset++] = timestampu8s[5];
		walBuffer[offset++] = timestampu8s[6];
		walBuffer[offset++] = timestampu8s[7];

		return walBuffer;
	}

	get key() {
		return this.#key;
	}

	get value() {
		return this.#value;
	}

	get keyType() {
		return this.#keyType;
	}

	get valueType() {
		return this.#valueType;
	}

	get offset() {
		return this.#offset;
	}

	get delete() {
		return this.#delete;
	}

	set delete(value: boolean) {
		this.#delete = value;
	}

	get length() {
		return this.#length;
	}

	get timestamp() {
		return this.#timestamp;
	}

	get dataBuffer() {
		return this.#dataBuffer;
	}

	get data() {
		return {
			key: this.#key,
			value: this.#value,
			keyType: this.#keyType,
			valueType: this.#valueType,
			offset: this.#offset,
			delete: this.#delete,
			length: this.#length,
			timestamp: this.#timestamp,
			dataBuffer: this.#dataBuffer,
		};
	}

	clone() {
		return new DataNode({
			key: this.#key,
			value: this.#value,
			keyType: this.#keyType,
			valueType: this.#valueType,
			offset: this.#offset,
			delete: this.#delete,
			length: this.#length,
			timestamp: this.#timestamp,
			dataBuffer: new Uint8Array(this.#dataBuffer),
		});
	}
}
