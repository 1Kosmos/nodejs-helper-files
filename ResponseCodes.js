'use strict';
const {ResponseCode} = require('./ResponseCode');
const httpStatus = require('http-status');

const ResponseCodes = {
    VALIDATION_ERROR:                 new ResponseCode(httpStatus.BAD_REQUEST, "000001", 'Validation errors'),
    INVALID_REQUEST:                  new ResponseCode(httpStatus.BAD_REQUEST,"000002", 'Invalid request'),
    ECDSA_ERROR:                      new ResponseCode(httpStatus.BAD_REQUEST,"000003", 'ECDSA error'),
    LEDGER_ACCOUNT_LIMIT_REACHED:     new ResponseCode(httpStatus.BAD_REQUEST,"00004", 'Account limit reached'),
    ALREADY_LINKED:                   new ResponseCode(httpStatus.BAD_REQUEST,"00005", 'Account already linked'),
    ALREADY_UNLINKED:                 new ResponseCode(httpStatus.BAD_REQUEST,"00006", 'Account already unlinked'),
    INVALID_KEY_TYPE:                 new ResponseCode(httpStatus.BAD_REQUEST,"00007", 'Invalid key type'),

    // 401
    UNAUTHORIZED:                     new ResponseCode(httpStatus.UNAUTHORIZED,"000001", 'You are not authorized.'),
    REQUEST_ID_TIMED_OUT:             new ResponseCode(httpStatus.UNAUTHORIZED,"000002", 'You are not authorized.'),
    SYSTEM_KEY_CHECK_FAILED:          new ResponseCode(httpStatus.UNAUTHORIZED,"000003", 'System key check failed.'),
    SERVICE_KEY_NOT_FOUND:            new ResponseCode(httpStatus.UNAUTHORIZED,"000004", 'Service key not found'),

    // 404
    DATA_NOT_FOUND:                   new ResponseCode(httpStatus.NOT_FOUND,"000001", 'Data not found'),

    // 408
    REQUEST_TIMED_OUT:                new ResponseCode(httpStatus.REQUEST_TIMEOUT, "000001", 'Request is timed out'),

    // 500
    ERROR_DUE_TO_UNKNOWN_REASON:      new ResponseCode(httpStatus.INTERNAL_SERVER_ERROR, "000001", 'Unknown error'),
    SERVICE_INITIALIZATION_ERROR:     new ResponseCode(httpStatus.INTERNAL_SERVER_ERROR, "000002", 'Unable to initialize service'),
    UNABLE_TO_CREATE_SHARED_KEY:      new ResponseCode(httpStatus.INTERNAL_SERVER_ERROR, "000003", 'Unable to create shared key'),
    UNABLE_TO_ENCRYPT:                new ResponseCode(httpStatus.INTERNAL_SERVER_ERROR, "000004", 'Unable to encrypt message'),
    UNABLE_TO_DECRYPT:                new ResponseCode(httpStatus.INTERNAL_SERVER_ERROR, "000005", 'Unable to decrypt message'),
    UNABLE_TO_DELETE_SERVICE_KEY:     new ResponseCode(httpStatus.INTERNAL_SERVER_ERROR, "000005", 'Unable to delete service keys'),
    UNABLE_TO_CREATE_SERVICE_KEY:     new ResponseCode(httpStatus.INTERNAL_SERVER_ERROR, "000006", 'Unable to create service keys'),
}


module.exports = {ResponseCodes};
