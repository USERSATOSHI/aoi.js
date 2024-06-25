import { isUint32Array } from "util/types";

export function LZWEncode(key: string): Uint16Array {
	const map = new Map<string, number>();


	for (let i = 0; i < 256; i++) {
		map.set(String.fromCharCode(i), i);
	}


	let dictionary = 256;
	let result: number[] = [];

	let current = '';
	let prev = key[0];
	for (let i = 0; i < key.length; i++) {
		if (i !== key.length-1) {
			current += key[i+1];
		}

		if (map.has(prev + current)) {
			prev += current;
		} else {
			result.push(map.get(prev)!);
			map.set(prev + current, dictionary++);
			prev = current;
		}

		current = '';
	}
	result.push(map.get(prev)!);
	return (new Uint16Array(result));
}

export function LZWDecode(op: Uint16Array) {
	const buffer = new Uint16Array(op.buffer);
	const map = new Map<number, string>();

	for (let i = 0; i < 256; i++) {
		map.set(i, String.fromCharCode(i));
	}

	let old = buffer[0], n;
	let result = '';
	let string = map.get(old) ?? '';
	let current = '';

	current += string[0];
	result += string;
	let dictionary = 256;

	for (let i = 0; i < buffer.length-1; i++) {
		n = buffer[i+1];
		if (!map.has(n)) {
			string = map.get(old) ?? '';
			string += current;
		} else {
			string = map.get(n) ?? '';
		}

		result += string;
		current = string[0];

		map.set(dictionary++, (map.get(old) ?? '') + current);
		old = n;
	}

	return result;
}
