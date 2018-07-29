'use strict';
const Discord = require('discord.js');
const mongoose = require('mongoose');

const config = require('./json/config.json');
const cmds = require('./commands.js');
const ani = require('./anime.js');
const tool = require('./util/tool.js');

const bot = new Discord.Client();

bot.on('ready', () => {
    console.log('Inazuma desu. Yoroshiku onegai itashimasu.');
    console.log(`Serving ${bot.guilds.size} guilds.`);

    bot.user.setActivity('~help');

    ani.passClient(bot);
    ani.requestMissingSchedules();
    setInterval(ani.requestMissingSchedules, 86400000); //Request every 24 hours.
});

bot.on('message', msg => {
    if (msg.author.bot || msg.channel.type != 'text')
        return; // Do not respond to messages from bots or messages that are not from guilds.

    //Replies to non-commands.
    if (msg.content.toLowerCase().match(/^ay{2,}$/)) //Ayy lmao.
        msg.channel.send('lmao');
    else if (msg.content.toLowerCase().search(/^same+$/) >= 0) //same.
        msg.channel.send('same');
    else if (msg.content.search('299400284906717186') >= 0) //Random reply when bot is mentioned.
        reply(msg);

    if (!msg.content.startsWith(config.prefix))
        return; //Not a command.

    let cmd = msg.content.split(/\s+/)[0].slice(config.prefix.length).toLowerCase();
    if (cmds[cmd]) cmds[cmd](msg); //Call command if it exists.
});

bot.on('error', (e) => console.error(e));
bot.on('warn', (e) => console.warn(e));
// bot.on('debug', (e) => console.info(e));
bot.login(config.token);


mongoose.connect(config.mongo_url);
mongoose.connection.on('error', console.error.bind(console, 'connection:error:'));
mongoose.connection.once('open', () => {
    console.log('Connected to database!');
});

function reply(msg) {
    const replies = [
        `Nani yo?`,
        `What do you want, ${tool.tsunNoun()}...`,
        `Hmmmphh.`,
        `Kimochi warui.`,
        `Baka janaino?`,
        `Doushitano?`
    ];
    msg.channel.send(replies[tool.randInt(replies.length)]);
}
