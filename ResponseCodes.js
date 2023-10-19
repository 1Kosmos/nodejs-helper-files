'use strict';
const {ResponseCode} = require('./ResponseCode');
const httpStatus = require('http-status');

const ResponseCodes = {
    
    // 500
    SERVICE_INITIALIZATION_ERROR: new ResponseCode(httpStatus.INTERNAL_SERVER_ERROR, "000002", 'Unable to initialize service'),
}


module.exports = {ResponseCodes};