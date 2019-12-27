const { pluginDescriptions } = require('../../util/help.js');

class AbstractCommandPlugin {
    constructor(...commands) {
        if (this.constructor === AbstractCommandPlugin) {
            throw new Error('Cannot instantiate an abstract class.');
        }

        this.loadCommands(commands);
        this.client = null;
    }

    get name() {
        throw new Error('name must be overwritten.');
    }

    get description() {
        return pluginDescriptions[this.name] || '';
    }

    loadCommands(commands) {
        this.commands = commands.slice().map((command) => new command());
        this.commands.forEach((command) => {
            if (command.requiresParent) {
                command.loadParent(this);
            }
        });
    }

    load(client) {
        this.client = client;
        return Promise.resolve(this);
    }

    handleMessage({ msg, args, commandStr, options, plugin }) {
        const commandName = args[0].slice(this.client.prefix.length);
        const commandArgs = args.slice(1);

        for (const command of this.commands) {
            if (command.name === commandName || command.aliases.indexOf(commandName) > -1) {
                return command.handleMessage({
                    msg,
                    args: commandArgs,
                    commandStr,
                    options,
                    plugin
                });
            }
        }
    }
}

module.exports = AbstractCommandPlugin;
