/* eslint-disable no-unused-vars */
const helpLibrary = require('../../util/help.js');
const { wrap } = require('../../util/util.js');

class AbstractCommand {
    constructor() {
        if (constructor === AbstractCommand) {
            throw new Error('Cannot instantiate an abstract class.');
        }
    }

    get name() {
        throw new Error('name must be overwritten.');
    }

    get aliases() {
        return [];
    }

    get description() {
        return helpLibrary.descriptions[this.name] || 'No description.';
    }

    get usage() {
        return helpLibrary.usages[this.name] || `Gomen, there's no usage info for ${wrap(this.name)}.`;
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
