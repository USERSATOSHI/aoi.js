import { type DataType } from '@aoi.db/typings/type.js';
import DataNode from './DataNode.js';

/**
 * A class representing a BufferNode
 */
export default class BufferNode {
	readonly #data: Uint8Array;
	readonly #offset: number;
	readonly #keyType: DataType;
	readonly #valueType: DataType;

	/**
	 * Creates an instance of BufferNode.
	 * @param data - The data of the BufferNode
	 * @param keyType - The key type
	 * @param valueType - The value type
	 * @param offset - The offset of the BufferNode
	 * @returns An instance of BufferNode
	 * 
	 * @example
	 * ```ts
	 * const bufferNode = new BufferNode(new Uint8Array(10), 'str:20', 'str:20');
	 * ```
	 */
	constructor(
		data: Uint8Array,
		keyType: DataType,
		valueType: DataType,
		offset = 0,
	) {
		this.#data = data;
		this.#offset = offset;
		this.#keyType = keyType;
		this.#valueType = valueType;
	}

	/**
	 * Build the DataNode from the BufferNode
	 * @returns The DataNode
	 * 
	 * @example
	 * ```ts
	 * <BufferNode>.build();
	 * ```
	 */
	build() {
		return DataNode.fromUint8Array(this.#data, this.#offset, {
			keyDataType: this.#keyType,
			dataType: this.#valueType,
		});
	}

	/**
	 * Check if the BufferNode is deleted
	 * @returns If the BufferNode is deleted
	 */
	isDeleted() {
		return this.#data.at(-5) === 1;
	}

	/**
	 * Get the buffer of the BufferNode
	 * @returns The buffer
	 * 
	 * @example
	 * ```ts
	 * <BufferNode>.buffer;
	 * ```
	 */
	get buffer() {
		return this.#data;
	}
}
