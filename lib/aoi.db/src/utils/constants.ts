export const WAL_FILE_MAGIC_NUMBER = new Uint8Array([0x57, 0x41, 0x4c, 0x46]);
export const WAL_START_DELIMITER = new Uint8Array([0x01, 0x10, 0xef, 0xfe]);
export const WAL_END_DELIMITER = new Uint8Array([0xfe, 0xef, 0x10, 0x01]);
export const WAL_BASE_SIZE = 18;

export const SST_HEADER = 5;
export const SST_METADATA = 3;
export const SST_TABLE_MAGIC_NUMBER = new Uint8Array([0x53, 0x53, 0x54, 0x54]);
export const SST_SUPPORTED_VERSION = [1];
export const SST_KVS_PER_PAGE = 1000;
export const SST_DATA_START_DELIMITER = new Uint8Array([0x53, 0x54, 0x41, 0x52]);
export const SST_DATA_END_DELIMITER = new Uint8Array([0x45, 0x4e, 0x44, 0x45]);
export const SST_BASE_BYTES = 25;