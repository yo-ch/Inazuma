class ArgError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ArgError';
    }
}

module.exports = ArgError;