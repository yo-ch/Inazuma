const AbstractCommandPlugin = require('../lib/base/AbstractCommandPlugin.js');
const AbstractCommand = require('../lib/base/AbstractCommand.js');

const { Attachment } = require('discord.js');

const util = require('../util/util.js');

class InsideJokeCommandPlugin extends AbstractCommandPlugin {
    constructor() {
        super(
            AndyCommand,
            GavQuoteCommand,
            WeebAtWeebCommand
        );
    }

    get name() {
        return 'insidejokes';
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
        this.quoteLibrary = require('../resources/json/gavquotes.json');
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

/**
 * Tag a weeb as a weeb using a picture.
 */
class WeebAtWeebCommand extends AbstractCommand {
    constructor() {
        super();
        this.jimp = require('jimp');
    }

    get name() {
        return 'weeb';
    }

    async handleMessage({ msg }) {
        if (msg.mentions.users.size === 0) {
            return msg.channel.send('Mention a weeb to use this command!');
        }

        try {
            const baseImg = (await this.jimp.read('./resources/images/weeb1.png')).scale(0.5);

            const [weeberImg, weebedImg] = (await Promise.all([
                this.jimp.read(msg.author.avatarURL),
                this.jimp.read(msg.mentions.users.first().avatarURL)
            ])).map((img) => img.resize(70, 70));

            baseImg.composite(weeberImg, 90, 60, {
                opacitySource: 1,
                opacityDest: 1
            });

            baseImg.composite(weebedImg, 310, 120, {
                opacitySource: 1,
                opacityDest: 1
            });

            const imgBuffer = await baseImg.getBufferAsync(baseImg.getMIME());
            msg.channel.send(new Attachment(imgBuffer));
        } catch (err) {
            console.log(err.message);
        }
    }
}

module.exports = InsideJokeCommandPlugin;
