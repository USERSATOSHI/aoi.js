/*
- 0 - `int`
- 1 - `string`
- 2 - `float`
- 3 - `bool`
- 4 - `null`
- 5 - `array`
- 6 - `object`
- 7 - `bigint`
- 8 - `date` 
*/ 
export enum DataType {
	Integer,
	String,
	Float,
	Boolean,
	Null,
	Array,
	Object,
	BigInt,
	Date
}


export enum KeyEncodeType {
	LZW,
	Base64,
	RunLength,
	Dict,
	None,
}