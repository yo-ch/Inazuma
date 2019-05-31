const tool = require('../../util/tool.js');

class AbstractCommandPlugin {
    constructor(commands) {
        if (this.constructor === AbstractCommandPlugin) {
            throw new Error('Cannot instantiate an abstract class.');
        }

        this.loadCommands(commands);
        this.client = null;
    }

    get name() {
        throw new Error('name must be overwritten.')
    }

    get description() {
        return '';
    }

    loadCommands(commands) {
        this.commands = commands.slice().map(c => new c());
        this.commands.forEach(c => { if (c.requiresParent) c.loadParent(this); })
    }

    load(client) {
        this.client = client;
        return Promise.resolve(this);
    }

    handleMessage(msg, pluginParams) {
        const args = msg.content.split(/\s+/).filter(arg => arg !== '');
        const cmdArgs = args.slice(1);
        const options = tool.parseOptions(msg.content);

        for (const command of this.commands) {
            if (command.name === args[0].slice(this.client.prefix.length)) {
                return command.handleMessage({
                    msg: msg,
                    args: cmdArgs,
                    cmdStr: cmdArgs.join(' '),
                    options: options,
                    plugin: pluginParams
                });
            }
        }
    }
}

module.exports = AbstractCommandPlugin;
