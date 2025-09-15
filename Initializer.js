'use strict';
const ResponseError = require('./ResponseError');
const {ResponseCodes} = require('./ResponseCodes');
const BIDCaas = require('./BIDCaas');

/**
 * Initializer using module pattern since language constructs prevent
 * singleton implementations in JavaScript.
 */
const Initializer = (function() {
    var _origination = undefined;
    var _ecCurveName = undefined;

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
      },

        setECCurveName: function (curveName) {
            _ecCurveName = curveName;
        },

        getECCurveName: function () {
            if (!_ecCurveName) {
                console.error('ERROR: EC_CURVE_NAME missing or empty');
                process.exit(1);
            }
            return _ecCurveName;
        },

        fetchAndInitECCurveName: async function (apiUrl) {
            try {
                const response = await BIDCaas.getEnvironment(apiUrl);
                if (!response || !response.EC_CURVE_NAME) {
                    console.error('ERROR: EC_CURVE_NAME missing or empty');
                    process.exit(1);
                }
                Initializer.setECCurveName(response.EC_CURVE_NAME);
            } catch (err) {
                console.error('ERROR: Failed to fetch EC_CURVE_NAME from API:', err.message);
                process.exit(1);
            }
      }
    };
  })();

  module.exports = {
    Initializer
  }
  