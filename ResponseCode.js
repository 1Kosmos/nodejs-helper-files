"use strict";

class ResponseCode {

    constructor(statusCode, errorCode, message)
    {
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.message = message;
    }
}

module.exports = { ResponseCode};