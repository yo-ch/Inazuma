const Inazuma = require('./lib/Bot.js');
const CoreCommandPlugin = require('./commands/CoreCommandPlugin.js');
const AnimeCommandPlugin = require('./commands/AnimeCommandPlugin.js');
const InsideJokeCommandPlugin = require('./commands/InsideJokeCommandPlugins.js');


const config = require('./json/config.json');

const ina = new Inazuma();
ina.loadCommandPlugin(new CoreCommandPlugin());
ina.loadCommandPlugin(new AnimeCommandPlugin());
ina.loadCommandPlugin(new InsideJokeCommandPlugin());

ina.login(config.token);


// mongoose.connect(config.mongo_url, { useNewUrlParser: true });
// mongoose.connection.on('error', console.error.bind(console, 'connection:error:'));
// mongoose.connection.once('open', () => {
//     console.log('Connected to database!');
// });

// function reply(msg) {
//     const replies = [
//         `Nani yo?`,
//         `What do you want, ${tool.tsunNoun()}...`,
//         `Hmmmphh.`,
//         `Kimochi warui.`,
//         `Baka janaino?`,
//         `Doushitano?`
//     ];
//     msg.channel.send(replies[tool.randInt(replies.length)]);
// }
