const AbstractCommandPlugin = require('../lib/base/AbstractCommandPlugin.js');
const AbstractCommand = require('../lib/base/AbstractCommand.js');

const util = require('../util/util.js');

class InsideCommandPlugin extends AbstractCommandPlugin {
    constructor() {
        super(
            AndyCommand,
            GavQuoteCommand
        );
    }

    get name() {
        return 'insidejokes';
    }

    get description() {
        return 'Inside joke commands.';
    }
}


class AndyCommand extends AbstractCommand {
    get name() {
        return 'andy';
    }

    handleMessage({ msg }) {
        msg.delete();
        const user = msg.mentions.users.first();
        if (user) {
            msg.channel.send(`Shut up weeb. ${user}`);
        } else {
            msg.channel.send('Shut up weeb.');
        }
    }
}

class GavQuoteCommand extends AbstractCommand {
    constructor() {
        super();
        this.quoteLibrary = require('../json/gavquotes.json');
    }

    get name() {
        return 'gavquote';
    }

    handleMessage({ msg }) {
        msg.channel.send(
            `${util.wrap(this.quoteLibrary.quotes[util.randInt(this.quoteLibrary.quotes.length)])}`
        );
    }
}

module.exports = InsideCommandPlugin;
