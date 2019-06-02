const Inazuma = require('./lib/Bot.js');
const CoreCommandPlugin = require('./commands/CoreCommandPlugin.js');
const AnimeCommandPlugin = require('./commands/AnimeCommandPlugin.js');
const InsideJokeCommandPlugin = require('./commands/InsideJokeCommandPlugins.js');

const util = require('./util/util.js');
const config = require('./json/config.json');

const mongoose = require('mongoose');


const inazuma = new Inazuma();
inazuma.loadCommandPlugin(new CoreCommandPlugin());
inazuma.loadCommandPlugin(new AnimeCommandPlugin());
inazuma.loadCommandPlugin(new InsideJokeCommandPlugin());
inazuma.loadMiddleware(ayyLmaoMiddleware);
inazuma.loadMiddleware(sameMiddleware);
inazuma.loadMiddleware(mentionReplyMiddleware);
inazuma.login(config.token);


mongoose.connect(config.mongo_url, { useNewUrlParser: true });
mongoose.connection.once('open', () => {
    console.log('Connected to database!');
});
mongoose.connection.on('error', console.error.bind(console, 'connection:error:'));


/**
 * Middleware.
 */
function ayyLmaoMiddleware(msg) {
    if (msg.content.toLowerCase().match(/^ay{2,}$/)) { msg.channel.send('lmao'); }
}

function sameMiddleware(msg) {
    if (msg.content.toLowerCase().search(/^same+$/) >= 0) { msg.channel.send('same'); }
}

function mentionReplyMiddleware(msg) {
    if (msg.content.search(inazuma.user.id) >= 0) {
        const replies = [
            `Nani yo?`,
            `What do you want, ${util.tsunNoun()}...`,
            `Hmmmphh.`,
            `Kimochi warui.`,
            `Baka janaino?`,
            `Doushitano?`
        ];
        msg.channel.send(replies[util.randInt(replies.length)]);
    }
}