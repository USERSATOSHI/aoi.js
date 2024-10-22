import { type WriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { platform } from 'node:os';

import { safe } from '@aoi.db/utils/helpers.js';
import AoiDBError from '@aoi.db/utils/error.js';

/**
 * A class representing a BufferredWriter
 */
export default class BufferredWriter {
	readonly #path: string;
	readonly #bufferSize: number;
	#file!: fs.FileHandle;
	#size = 0;
	#stream!: WriteStream;
	#fileSize = 0;
	#canBeCorked = true;

	/**
	 * Creates an instance of BufferredWriter.
	 * @param path - The path of the file
	 * @param bufferSize - The buffer size before flushing
	 * @returns An instance of BufferredWriter
	 * 
	 * @example
	 * ```ts
	 * const writer = new BufferredWriter('path/to/file', 1024);
	 * ```
	 */
	constructor(path: string, bufferSize: number) {
		this.#path = path;
		this.#bufferSize = bufferSize;
		this.#size = 0;
	}

	/**
	 * Initialize the BufferredWriter
	 * 
	 * @example
	 * ```ts
	 * await <BufferredWriter>.init();
	 * ```
	 */
	async init() {
		const [openErr, file] = await safe(
			fs.open(
				this.#path,
				fs.constants.O_RDWR |
					fs.constants.O_CREAT |
					(platform() === 'win32' ? 0 : fs.constants.O_APPEND),
			),
		);

		if (openErr) {
			throw AoiDBError.DatabaseInternalError(
				`Failed to open path ${this.#path}: ${openErr.message}`,
			);
		}

		this.#file = file;
		const [statErr, stats] = await safe(this.#file.stat());
		if (statErr) {
			throw AoiDBError.DatabaseInternalError(
				`Failed to get stats for path ${this.#path}: ${statErr.message}`,
			);
		}

		this.#fileSize = stats.size;

		this.#stream = this.#file.createWriteStream({
			start: this.#fileSize,
		});
	}


	/**
	 * Append data to the file
	 * @param data - The data to append
	 * 
	 * @example
	 * ```ts
	 * <BufferredWriter>.append(new Uint8Array(10));
	 * ```
	 */
	append(data: Uint8Array<ArrayBuffer>) {
		if (this.#canBeCorked) {
			this.#stream.cork();
		}

		this.#size += data.byteLength as number;
		this.#stream.write(data);

		if (this.#size >= this.#bufferSize) {
			this.#flush();
		}
	}

	/**
	 * Close the BufferredWriter
	 * 
	 * @example
	 * ```ts
	 * await <BufferredWriter>.close();
	 * ```
	 */
	async close() {
		this.#flush();
		this.#stream.end();
		await this.#file.close();
	}

	/**
	 * Flush the BufferredWriter
	 */
	#flush() {
		if (!this.#canBeCorked) {
			this.#stream.uncork();
			this.#canBeCorked = true;
		}

		this.#size = 0;
	}

	/**
	 * Get the current size of the buffer
	 */
	get size() {
		return this.#size;
	}

	/**
	 * Get the file size
	 */
	get fileSize() {
		return this.#fileSize;
	}

	/**
	 * Get the path of the file
	 */
	get path() {
		return this.#path;
	}

	/**
	 * Get the size limit of the buffer
	 */
	get bufferSize() {
		return this.#bufferSize;
	}

	/**
	 * Get if the buffer can be cork
	 * @returns If the buffer can be cork
	 */
	get canBeCorked() {
		return this.#canBeCorked;
	}

	/**
	 * Get the stream of the BufferredWriter
	 * @returns The stream
	 */
	get stream() {
		return this.#stream;
	}

	/**
	 * Get the file of the BufferredWriter
	 * @returns The file
	 */
	get file() {
		return this.#file;
	}
}
