const AbstractCommandPlugin = require('../lib/base/AbstractCommandPlugin.js');
const AbstractCommand = require('../lib/base/AbstractCommand.js');

const helpLibrary = require('../util/help.js');

const tool = require('../util/tool.js');

class CoreCommandPlugin extends AbstractCommandPlugin {
    constructor() {
        super([
            HelpCommand,
            ChooseCommand,
            RollCommand
        ]);
    }

    get name() {
        return 'core';
    }

    get description() {
        return 'core commands';
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
        // Help for specific command or the general help text.
        let helpStr;
        if (args.length) {
            const command = this.parent.client.findPluginCommand(args[0]);
            helpStr = command ? command.description : helpLibrary.default;
        } else {
            helpStr = helpLibrary.default;
        }

        msg.channel.send(helpStr, {
            'code': 'css'
        });
    }
}

class ChooseCommand extends AbstractCommand {
    get name() {
        return 'choose';
    }

    handleMessage({ msg, cmdStr }) {
        const choices = cmdStr
            .split('|')
            .map(arg => arg.trim())
            .filter(arg => arg !== '');

        if (choices.length >= 1) {
            msg.channel.send(choices[tool.randInt(choices.length)]);
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
            msg.channel.send(tool.randInt(6) + 1);
        } else if (args.length === 1) {
            const upper = parseInt(args[0]);

            if (!tool.isInt(upper)) {
                return msg.channel.send(`Give me numbers ${tool.tsunNoun()}!`);
            }

            msg.channel.send(tool.randInt(upper) + 1);
        } else {
            const num1 = parseInt(args[0]);
            const num2 = parseInt(args[1]);

            if (!tool.isInt(num1) || !tool.isInt(num2)) {
                return msg.channel.send(`Give me numbers ${tool.tsunNoun()}!`);
            }

            if (num1 > num2) {
                msg.channel.send(tool.randInt(num1 - num2 + 1) + num2);
            } else {
                msg.channel.send(tool.randInt(num2 - num1 + 1) + num1);
            }
        }
    }
}

module.exports = CoreCommandPlugin;
