const Discord = require('discord.js');
const config = require('../config.json');

const util = require('../util/util.js');

class Bot extends Discord.Client {
    constructor() {
        super();

        this.prefix = config.prefix;
        this.commandPlugins = {};
        this.middleware = [];

        // Events.
        this.on('ready', () => {
            console.log('Inazuma ready.');
            console.log(`Serving ${this.guilds.size} guilds.`);

            this.user.setActivity('~help');
        });
        this.on('message', this.handleMessage);
        this.on('error', (e) => console.error(e));
        this.on('warn', (e) => console.warn(e));
    }

    loadCommandPlugin(plugin) {
        if (!plugin.name || !!this.commandPlugins[plugin.name]) {
            throw new Error('Plugin must have a unique name.');
        }

        const result = plugin.load(this);
        this.commandPlugins[plugin.name] = plugin;

        return result;
    }

    unloadCommandPlugin(pluginName) {
        delete this.commandPlugins[pluginName];
    }

    loadMiddleware(middleware) {
        if (middleware && typeof middleware === 'function') {
            this.middleware.push(middleware);
        }
        return Promise.resolve(middleware);
    }

    findCommandPlugin(pluginName) {
        for (const commandPlugin of Object.values(this.commandPlugins)) {
            if (util.stringEqualsIgnoreCase(commandPlugin.name, pluginName)) {
                return commandPlugin;
            }
        }
        return null;
    }

    findCommand(commandName) {
        for (const commandPlugin of Object.values(this.commandPlugins)) {
            for (const command of commandPlugin.commands) {
                if (util.stringEqualsIgnoreCase(command.name, commandName)) {
                    return command;
                }
            }
        }
        return null;
    }

    handleMessage(msg) {
        if (msg.author.bot || msg.channel.type !== 'text') {
            return;
        }

        for (const middleware of this.middleware) {
            middleware(msg);
        }

        if (!msg.content.startsWith(config.prefix)) {
            return;
        }

        const args = msg.content.split(/\s+/).filter((arg) => arg !== '');
        const options = util.parseOptions(msg.content);
        const commandStr = util.removeOptions(args.slice(1).join(' '), options);

        for (const plugin of Object.values(this.commandPlugins)) {
            plugin.handleMessage({
                msg,
                args,
                commandStr,
                options
            });
        }
    }
}

module.exports = Bot;