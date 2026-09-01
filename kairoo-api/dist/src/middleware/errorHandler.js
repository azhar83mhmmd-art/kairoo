"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    const message = error instanceof Error
        ? error.message
        : 'Internal Server Error';
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, error);
    return res.status(500).json({
        status: false,
        message
    });
};
exports.errorHandler = errorHandler;
