const Discord = require('discord.js');
const config = require('../json/config.json');

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

            this.user.setActivity('Kantai Collection');
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

    loadMiddleware(middleware) {
        if (middleware && typeof middleware === 'function') {
            this.middleware.push(middleware);
        }
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

        for (const plugin of Object.values(this.commandPlugins)) {
            plugin.handleMessage(msg);
        }
    }
}

module.exports = Bot;