import { OrderedMap, type OrderedMapIterator } from '@js-sdsl/ordered-map';
import { TypedEmitter } from 'tiny-typed-emitter';

import { type IMemTableEvents } from '@aoi.db/typings/interface.js';
import { type u32 } from '@aoi.db/typings/type.js';
import type DataNode from '../structures/DataNode.js';
import { MemTableEvent } from '@aoi.db/typings/enum.js';

export default class MemoryTable extends TypedEmitter<IMemTableEvents> {
	readonly #threshold: u32;
	#buffer: OrderedMap<DataNode['key'], DataNode>;
	#lock: boolean;
	#iter: OrderedMapIterator<DataNode['key'], DataNode>;
	#waitQueue: OrderedMap<DataNode['key'], DataNode>;
	#waitIter: OrderedMapIterator<DataNode['key'], DataNode>;

	constructor(threshold: u32) {
		super();
		this.#threshold = threshold;
		this.#buffer = new OrderedMap();
		this.#lock = false;
		this.#iter = this.#buffer.begin();
		this.#waitQueue = new OrderedMap();
		this.#waitIter = this.#waitQueue.begin();
	}

	insert(data: DataNode) {
		if (this.#lock) {
			this.#waitQueue.setElement(data.key, data, this.#waitIter);
			return;
		}

		this.#buffer.setElement(data.key, data, this.#iter);
		if (this.#buffer.size() >= this.#threshold) {
			this.#lock = true;
			this.emit(MemTableEvent.NeedsFlush);
		}
	}

	has(key: DataNode['key']) {
		return (
			!this.#buffer.find(key).equals(this.#buffer.end()) ||
			!this.#waitQueue.find(key).equals(this.#waitQueue.end())
		);
	}

	get(key: DataNode['key']) {
		return (
			this.#buffer.getElementByKey(key) ??
			this.#waitQueue.getElementByKey(key)
		);
	}

	peekAll() {
		const data = new Array<[DataNode['key'], DataNode['data']]>(
			this.#buffer.size(),
		);
		let idx = 0;
		for (const [k, node] of this.#buffer) {
			data[idx++] = [k, node.data];
		}

		return data;
	}

	flush() {
		this.#lock = false;
		const buffer = this.#buffer;
		this.#buffer = this.#waitQueue;
		this.#waitQueue = new OrderedMap();
		this.#iter = this.#buffer.begin();
		this.#waitIter = this.#waitQueue.begin();

		this.emit(MemTableEvent.BufferOpened);
		const data = new Array<Uint8Array>(buffer.size());

		let idx = 0;
		for (const [_, node] of buffer) {
			data[idx++] = node.toUint8Array();
		}

		return data;
	}

	clear() {
		this.#buffer.clear();
		this.#iter = this.#buffer.begin();
		this.#lock = false;
	}

	stats() {
		return {
			size: this.size,
			isEmpty: this.isEmpty,
			lock: this.#lock,
		};
	}

	get size() {
		return this.#buffer.size();
	}

	get isEmpty() {
		return this.#buffer.empty();
	}
}
