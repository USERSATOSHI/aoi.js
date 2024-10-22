/**
 * A simple mutex implementation.
 */
export default class Mutex {
	#lock = false;
	readonly #queue: Array<() => void> = [];

	/**
	 * Lock the mutex
	 */
	async lock() {
		return new Promise<void>((resolve) => {
			if (!this.#lock) {
				this.#lock = true;
				resolve();
				return;
			}

			this.#queue.push(resolve);
		});
	}

	/**
	 * Unlock the mutex
	 */
	unlock() {
		if (this.#queue.length > 0) {
			const resolve = this.#queue.shift()!;
			resolve();
			return;
		}

		this.#lock = false;
	}

	/**
	 * Check if the mutex is locked
	 */
	isLocked() {
		return this.#lock;
	}
}
