const Inazuma = require('./lib/Bot.js');
const CoreCommandPlugin = require('./commands/CoreCommandPlugin.js');
const AnimeCommandPlugin = require('./commands/AnimeCommandPlugin.js');
const MusicCommandPlugin = require('./commands/MusicCommandPlugin.js');
const InsideJokeCommandPlugin = require('./commands/InsideJokeCommandPlugins.js');

const util = require('./util/util.js');
const config = require('./config.json');

const mongoose = require('mongoose');


const inazuma = new Inazuma();
inazuma.loadCommandPlugin(new CoreCommandPlugin());
inazuma.loadCommandPlugin(new AnimeCommandPlugin());
inazuma.loadCommandPlugin(new MusicCommandPlugin());
inazuma.loadCommandPlugin(new InsideJokeCommandPlugin());

inazuma.loadMiddleware(ayyLmaoMiddleware);
inazuma.loadMiddleware(sameMiddleware);
inazuma.loadMiddleware(mentionReplyMiddleware);
inazuma.login(config.token).then(connectDatabase);


function connectDatabase() {
    const mon = mongoose.connect(config.mongo_url, { useNewUrlParser: true });
    mongoose.connection.once('open', () => console.log('Connected to database!'));
    mongoose.connection.on('error', console.error.bind(console, 'connection:error:'));
    return mon;
}

/**
 * Middleware.
 */
function ayyLmaoMiddleware(msg) {
    if (msg.content.toLowerCase().match(/^ay{2,}$/)) { msg.channel.send('lmao'); }
}

function sameMiddleware(msg) {
    if (msg.content.toLowerCase().search(/^same+$/) > -1) { msg.channel.send('same'); }
}

function mentionReplyMiddleware(msg) {
    if (msg.content.search(inazuma.user.id) > -1) {
        const replies = [
            `What do you want, ${util.tsunNoun()}...`,
            `Hmmmphh.`,
            `Kimochi warui.`,
            `Baka janaino?`,
            `Doushitano?`,
            `I-It's not like I want to be in this server or anything, ${util.tsunNoun()}...`
        ];
        msg.channel.send(replies[util.randInt(replies.length)]);
    }
}

