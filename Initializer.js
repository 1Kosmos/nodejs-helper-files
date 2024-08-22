'use strict';
const ResponseError = require('./ResponseError');
const {ResponseCodes} = require('./ResponseCodes');

/**
 * Initializer using module pattern since language constructs prevent
 * singleton implementations in JavaScript.
 */
const Initializer = (function() {
    var _origination = undefined;
  
    return { // public interface
      setOrigination: function (origination) {
        if(_origination)
        {
            throw new ResponseError(ResponseCodes.SERVICE_INITIALIZATION_ERROR);
        }
        _origination = origination;
      },

      getOrigination: function () {
        if(!_origination) return "service_uninitialized";
        return _origination;
      }
    };
  })();

  module.exports = {
    Initializer
  }
  