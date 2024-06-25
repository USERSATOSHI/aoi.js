export function base64Encode(data: string): string {
	return Buffer.from(data).toString('base64');
}

export function base64Decode(buffer: string): string {
	return Buffer.from(buffer, 'base64').toString();
}

