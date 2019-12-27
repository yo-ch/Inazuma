/* eslint-disable no-unused-vars */
const { commandDescriptions, commandUsages } = require('../../util/help.js');

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
        return commandDescriptions[this.name] ||
            'No description.';
    }

    get usage() {
        return commandUsages[this.name] ||
            `Gomen, there's no usage info for ${this.name}.`;
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
