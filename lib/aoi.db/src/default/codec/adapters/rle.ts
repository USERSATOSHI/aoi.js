export function runLengthEncode(key: string): number[] {
	let str = '';
	let len = key.length;
	for (let i = 0; i < len; i++) {
		let count = 1;
		while (i < len - 1 && key[i] == key[i + 1]) {
			count++;
			i++;
		}
		str += key[i] + count;
	}

	return str.split('').map((char) => char.charCodeAt(0));
}

export function runLengthDecode(buffer: Uint8Array): string {
	let str = '';
	for (let i = 0; i < buffer.length; i += 2) {
		str += buffer[i].toString().repeat(buffer[i + 1]);
	}
	return str;
}
