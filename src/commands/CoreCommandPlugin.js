const AbstractCommandPlugin = require('../lib/base/AbstractCommandPlugin.js');
const AbstractCommand = require('../lib/base/AbstractCommand.js');

const util = require('../util/util.js');

class CoreCommandPlugin extends AbstractCommandPlugin {
    constructor() {
        super(
            HelpCommand,
            UsageCommand,
            ChooseCommand,
            RollCommand
        );
    }

    get name() {
        return 'core';
    }
}

class HelpCommand extends AbstractCommand {
    get name() {
        return 'help';
    }

    get requiresParent() {
        return true;
    }

    handleMessage({ msg, args }) {
        // Reply with help for the plugin or the bot plugin list if the plugin wasn't found.
        const plugin = this.parent.client.findCommandPlugin(args[0]);
        if (plugin) {
            msg.channel.send(this.getPluginCommands(plugin));
        } else {
            msg.channel.send(this.getPluginList());
        }
    }

    getPluginCommands(plugin) {
        let pluginCommands = `${util.wrap(`${plugin.name} commands`, '**')} - ${plugin.description}\n`;
        for (const command of plugin.commands) {
            const { name, description } = command;
            pluginCommands += `${util.wrap(name)} ${description}\n`;
        }
        return pluginCommands;
    }

    getPluginList() {
        let pluginList = '**Inazuma Command Plugins**\n';
        for (const commandPlugin of Object.values(this.parent.client.commandPlugins)) {
            const { name, description } = commandPlugin;
            pluginList += `${util.wrap(name)} ${description}\n`;
        }
        return pluginList;
    }
}

class UsageCommand extends AbstractCommand {
    get name() {
        return 'usage';
    }

    get requiresParent() {
        return true;
    }

    handleMessage({ msg, args }) {
        // Reply with usage details for the specified command.
        if (args.length) {
            const command = this.parent.client.findCommand(args[0]);
            const aliasList = command.aliases.length > 0 ?
                `\n\nAliases: ${command.aliases.reduce((list, alias) => `${alias} ${list}`, '')}` :
                '';

            msg.channel.send(
                command ?
                    `${this.parent.client.prefix + command.name} ${command.usage} ${aliasList}` :
                    `There's no command called ${args[0]}!`,
                { code: true }
            );
        } else {
            msg.channel.send('Give me a command to describe.');
        }
    }
}

class ChooseCommand extends AbstractCommand {
    get name() {
        return 'choose';
    }

    handleMessage({ msg, commandStr }) {
        const choices = commandStr.split('|')
            .map((arg) => arg.trim())
            .filter((arg) => arg !== '');

        if (choices.length >= 1) {
            msg.channel.send(choices[util.randInt(choices.length)]);
        } else {
            msg.channel.send('Give me some choices to pick from!');
        }
    }
}

class RollCommand extends AbstractCommand {
    get name() {
        return 'roll';
    }

    handleMessage({ msg, args }) {
        if (args.length === 0) {
            msg.channel.send(util.randInt(6) + 1);
        } else if (args.length === 1) {
            const upper = parseInt(args[0]);

            if (!util.isInt(upper)) {
                return msg.channel.send(`Give me numbers ${util.tsunNoun()}!`);
            }

            msg.channel.send(util.randInt(upper) + 1);
        } else {
            const num1 = parseInt(args[0]);
            const num2 = parseInt(args[1]);

            if (!util.isInt(num1) || !util.isInt(num2)) {
                return msg.channel.send(`Give me numbers ${util.tsunNoun()}!`);
            }

            if (num1 > num2) {
                msg.channel.send(util.randInt(num1 - num2 + 1) + num2);
            } else {
                msg.channel.send(util.randInt(num2 - num1 + 1) + num1);
            }
        }
    }
}

module.exports = CoreCommandPlugin;
