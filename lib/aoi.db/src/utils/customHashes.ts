import {
	type signedInt,
	type unsignedInt,
	type u32,
	type u64,
	type i64,
} from '@aoi.db/typings/type.js';

// Hash Functions for Discord Ids
export function hashDiscordIdCharWise(userId: Uint8Array, seed: u32 = 0): u32 {
	let hash = seed >>> 0;

	// Process each character

	for (const char of userId) {
		hash = (hash * 31 + char) >>> 0; // Prime multiplier 31
	}

	// Final mixing
	hash ^= hash >>> 16;
	hash *= 0x85ebca6b;
	hash ^= hash >>> 13;
	hash *= 0xc2b2ae35;
	hash ^= hash >>> 16;

	return hash >>> 0;
}

export function hashDiscordUserIdFNV1a(userId: Uint8Array, seed: u32 = 0): u32 {
	let hash = 2166136261 ^ seed;

	for (const digit of userId) {
		hash ^= digit;
		hash = (hash * 16777619) >>> 0;
	}

	return hash >>> 0;
}

export function hashDiscordUserIdBigint(userId: u64, seed: u32 = 0): u32 {
	const bigintId = BigInt(userId);

	const low32 = Number(bigintId & 0xffffffffn);
	const high32 = Number((bigintId >> 32n) & 0xffffffffn);

	let hash = seed;
	hash ^= low32;
	hash ^= high32;

	hash = (hash ^ (hash >>> 16)) * 0x85ebca6b;
	hash ^= hash >>> 13;
	hash = (hash ^ (hash >>> 13)) * 0xc2b2ae35;
	hash ^= hash >>> 16;

	return hash >>> 0;
}

// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
export function hashInt(num: signedInt | unsignedInt, seed: u32 = 0): u32 {
	// seed the num
	num = num ^ seed;
	num = num + (seed << 13);

	num = ((num >> 16) ^ num) * 0x45d9f3b;
	num = ((num >> 16) ^ num) * 0x45d9f3b;
	num = (num >> 16) ^ num;
	return num;
}

// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
export function hashu64(num: u64 | i64, seed: u32 = 0): u32 {
	seed = seed >>> 0;

	const low32 = Number(num & 0xffffffffn);
	const high32 = Number((num >> 32n) & 0xffffffffn);

	const unsignedLow32 = low32 >>> 0;
	const unsignedHigh32 = high32 >>> 0;

	let hash = seed;

	hash ^= unsignedLow32;
	hash = (hash ^ (hash >>> 16)) * 0x85ebca6b;
	hash ^= unsignedHigh32;
	hash = (hash ^ (hash >>> 13)) * 0xc2b2ae35;
	hash ^= hash >>> 16;

	return hash >>> 0;
}
