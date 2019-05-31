const Discord = require('discord.js');
const config = require('../json/config.json');

class Bot extends Discord.Client {
    constructor() {
        super();

        this.prefix = config.prefix;
        this.commandPlugins = {};

        // Events.
        this.on('ready', () => {
            console.log('Inazuma ready.');
            console.log(`Serving ${this.guilds.size} guilds.`);

            this.user.setActivity(config.prefix + 'help');
        });
        this.on('message', this.handleMessage);
        this.on('error', e => console.error(e));
        this.on('warn', e => console.warn(e));
    }

    loadCommandPlugin(plugin) {
        if (!plugin.name || !!this.commandPlugins[plugin.name]) {
            throw new Error('Plugin must have a unique name.');
        }

        const result = plugin.load(this);
        this.commandPlugins[plugin.name] = plugin;

        return result;
    }

    findPluginCommand(commandName) {
        for (const commandPlugin of Object.values(this.commandPlugins)) {
            for (const command of commandPlugin.commands) {
                if (command.name.toLowerCase() === commandName.toLowerCase()) {
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

        // Replies to non-commands.
        if (msg.content.toLowerCase().match(/^ay{2,}$/)) {
            msg.channel.send('lmao');
        } else if (msg.content.toLowerCase().search(/^same+$/) >= 0) {
            msg.channel.send('same');
        } else if (msg.content.search('299400284906717186') >= 0) {
            //Random reply when bot is mentioned.
            reply(msg);
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