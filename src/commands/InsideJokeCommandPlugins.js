const AbstractCommandPlugin = require('../lib/base/AbstractCommandPlugin.js');
const AbstractCommand = require('../lib/base/AbstractCommand.js');

const tool = require('../util/tool.js');

class InsideCommandPlugin extends AbstractCommandPlugin {
    constructor() {
        super([
            AndyCommand,
            GavQuoteCommand
        ]);
    }

    get name() {
        return 'inside';
    }

    get description() {
        return 'inside joke commands';
    }
}


class AndyCommand extends AbstractCommand {
    get name() {
        return 'andy';
    }

    get description() {
        return '';
    }

    handleMessage({ msg }) {
        msg.delete();
        const user = msg.mentions.users.first();
        if (user) {
            msg.channel.send(`Shut up weeb. ${user}`);
        } else {
            msg.channel.send(`Shut up weeb.`)
        }
    }
}

class GavQuoteCommand extends AbstractCommand {
    get name() {
        return 'gavquote';
    }

    get description() {
        return '';
    }

    handleMessage({ msg }) {
        const gq = require('../json/gavquotes.json');
        msg.channel.send(`${tool.wrap(gq.quotes[tool.randInt(gq.quotes.length)])}`);
    }
}

module.exports = InsideCommandPlugin;
