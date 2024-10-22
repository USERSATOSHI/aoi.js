export default class AoiDBError extends Error {
	static DatabaseError(message: string) {
		const err = new AoiDBError(message);
		err.name = 'AoiDBError: [Database]';
		return err;
	}

	static DatabaseInternalError(message: string) {
		const err = new AoiDBError(message);
		err.name = 'AoiDBError: [DatabaseInternal]';
		return err;
	}

	static DatabaseConnectionError(message: string) {
		const err = new AoiDBError(message);
		err.name = 'AoiDBError: [DatabaseConnection]';
		return err;
	}

	static DatabaseSyntaxError(message: string) {
		const err = new AoiDBError(message);
		err.name = 'AoiDBError: [DatabaseSyntax]';
		return err;
	}

	static DatabaseTypeError(message: string) {
		const err = new AoiDBError(message);
		err.name = 'AoiDBError: [DatabaseType]';
		err.type = 'INVALID_DATA_TYPE';
		return err;
	}

	type?: string;

	constructor(message: string) {
		super(message);
		this.name = 'AoiDBError';
	}
}
