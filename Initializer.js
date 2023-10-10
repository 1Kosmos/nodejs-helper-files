'use strict';

/**
 * Initializer using module pattern since language constructs prevent
 * singleton implementations in JavaScript.
 */
const Initializer = (function() {
    var _origination = undefined;
  
    return { // public interface
      setOrigination: function (origination) {
        _origination = origination;
      },

      getOrigination: function () {
        if(!_origination) return "service_uninitialized";
        return _origination;
      }
    };
  })();

  export default Initializer;