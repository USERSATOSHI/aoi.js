# Codec

## Document Format

```js
[START][DataLength][KeyLength][Key][ValueType][ValueLength][Value][END]
```

- START: 4 bytes, decoded `:)`
- DataLength: 4 bytes, decoded `int`, the length of the data
- keyType: 1 byte, decoded `int`, the type of the key
- KeyLength: 4 bytes, decoded `int`, the length of the key
- Key: KeyLength bytes, the key
- ValueType: 1 byte, decoded `int`, the type of the value
- ValueLength: 4 bytes, decoded `int`, the length of the value
- Value: ValueLength bytes, the value
- END: 4 bytes, decoded `:(`

## Value Type

- 0 - `int`
- 1 - `string`
- 2 - `float`
- 3 - `bool`
- 4 - `null`
- 5 - `array`
- 6 - `object`

## Metadata Format

```js
[Headerlength][Header | MagicNumber | Version | Compression | Encoding | 