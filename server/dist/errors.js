export class ApiError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
    }
}
