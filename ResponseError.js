const Initializer = require('./Initializer');

class ResponseError extends Error {

    constructor(code, data, parentError) {
        super(code.message)
        this.message = code.message;
        this.data = data;
        this.statusCode = code.statusCode;
        this.errorCode = code.errorCode;
        this.origination = Initializer.getOrigination();

        if (parentError) {
            if (parentError.errorStack) {
                this.errorStack = parentError.errorStack;
            } else {
                this.errorStack = [];
            }
            this.errorStack.push(parentError);
        } 
    }
}

module.exports = { ResponseError };