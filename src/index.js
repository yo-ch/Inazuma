const Inazuma = require('./lib/Bot.js');
const CoreCommandPlugin = require('./commands/CoreCommandPlugin.js').default;
const AnimeCommandPlugin = require('./commands/AnimeCommandPlugin.js');
const InsideJokeCommandPlugin = require('./commands/InsideJokeCommandPlugins.js');

const util = require('./util/util.js');
const config = require('./json/config.json');

const mongoose = require('mongoose');


const ina = new Inazuma();
ina.loadCommandPlugin(new CoreCommandPlugin());
ina.loadCommandPlugin(new AnimeCommandPlugin());
ina.loadCommandPlugin(new InsideJokeCommandPlugin());

ina.loadMiddleware((msg) => { if (msg.content.toLowerCase().match(/^ay{2,}$/)) { msg.channel.send('lmao'); } });
ina.loadMiddleware((msg) => { if (msg.content.toLowerCase().search(/^same+$/) >= 0) { msg.channel.send('same'); } });
ina.loadMiddleware((msg) => {
    if (msg.content.search('299400284906717186') >= 0) {
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
});

ina.login(config.token);


mongoose.connect(config.mongo_url, { useNewUrlParser: true });
mongoose.connection.once('open', () => {
    console.log('Connected to database!');
});
mongoose.connection.on('error', console.error.bind(console, 'connection:error:'));