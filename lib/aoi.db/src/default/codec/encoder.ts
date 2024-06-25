import { KeyEncodeType } from "../typings.js";
import { base64Encode } from "./adapters/base64.js";
import { LZWEncode } from "./adapters/lzw.js";
import { runLengthEncode } from "./adapters/rle.js";

export default class Encoder<T> {
	#schema: T;
	#keyEncodeType: KeyEncodeType;

	constructor(schema: T, type: KeyEncodeType = KeyEncodeType.None) {
		this.#schema = schema;
		this.#keyEncodeType = type;
	}

	_encodeKey(key:string): number[] {
		switch (this.#keyEncodeType) {
			case KeyEncodeType.LZW:
				return LZWEncode(key);
			case KeyEncodeType.Base64:
				return base64Encode(key);
			case KeyEncodeType.RunLength:
				return runLengthEncode(key);
			case KeyEncodeType.Dict:
				return new TextEncoder().encode(key);
			default:
				return new TextEncoder().encode(key);
		}
	}
}