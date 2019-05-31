/* eslint-disable no-unused-vars */
const helpLibrary = require('../../util/help.js');

class AbstractCommand {
    constructor() {
        if (constructor === AbstractCommand) {
            throw new Error('Cannot instantiate an abstract class.')
        }
    }

    get name() {
        throw new Error('name must be overwritten.');
    }

    get description() {
        return helpLibrary[this.name] || `${this.name} help`;
    }

    get requiresParent() {
        return false;
    }

    loadParent(parent) {
        this.parent = parent;
        return Promise.resolve(this);
    }

    handleMessage(msg, args) {
        throw new Error('handleMessage must be overwritten.');
    }
}

module.exports = AbstractCommand;
