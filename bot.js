'use strict';
const Discord = require('discord.js');
const config = require('./config.json');

const cmds = require('./commands.js');
const ani = require('./anime.js');
const music = require('./music.js');
const tool = require('./tool.js');

const bot = new Discord.Client();

bot.on('ready', () => {
    console.log('Inazuma desu. Yoroshiku onegai itashimasu.');
    console.log(`Serving ${bot.guilds.size} guilds.`);

    bot.user.setGame('~help');
});

bot.on('message', msg => {
    if (msg.author.bot || !msg.channel.type == 'text')
        return; // Do not respond to messages from bots or messages that are not from guilds.

    //Replies to non-commands.
    if (msg.content.toLowerCase().match(/^ay{2,}$/)) //Ayy lmao.
        msg.channel.send('lmao');
    else if (msg.content.toLowerCase().startsWith('same')) //same.
        msg.channel.send('same');
    else if (msg.content.toLowerCase().search('inazuma') >= 0) //Tehe~.
        msg.channel.send('<:inaTehe:301555244330909697>');
    else if (msg.content.search(':inaGanbare:') >= 0)
        msg.channel.send(`Arigato! ${tool.inaHappy}`);
    else if (msg.content.search('299400284906717186') >= 0) //Random reply when bot is mentioned.
        reply(msg);
    else if (tool.isInt(parseInt(msg.content))) //Could be input for the Anilist search function.
        ani.anilistChoose(msg, parseInt(msg.content));

    if (!msg.content.startsWith(config.prefix))
        return; //Not a command.

    var cmd = msg.content.split(/\s+/)[0].slice(config.prefix.length).toLowerCase();
    switch (cmd) {
        case 'help':
        case 'tasukete':
            return cmds.help(msg);
        case 'andy':
            return cmds.andy(msg);
        case 'airing':
            return cmds.airing(msg);
        case 'ani':
        case 'anilist':
            return cmds.anilist(msg);
        case 'cc':
            return cmds.cc(msg);
        case 'choose':
            return cmds.choose(msg);
        case 'gavquote':
            return cmds.gavquote(msg);
        case 'prune':
            return cmds.prune(msg);
        case 'roll':
            return cmds.roll(msg);
        case 'vigne':
        case 'aoba':
            return cmds.retrieveImgurAlbum(msg);
        case 'music':
            return music.processCommand(msg);
    }
});

bot.on('guildMemberAdd', member => {
    member.guild.defaultChannel.send(
        `I-It's not like I wanted you to join this server or anything, ${tool.tsunNoun()}. ${member.user}`
    );
});

bot.on('guildMemberRemove', member => {
    member.guild.defaultChannel.send(`S-Sayonara. ${member.user}`);
});

// catch errors bot.on('error', (e) => console.error(e)); bot.on('warn', (e) =>
// console.warn(e)); bot.on('debug', (e) => console.info(e)); log our bot in
bot.login(config.token);

function reply(msg) {
    const replies = [
        `Nani yo?`,
        `What do you want, ${tool.tsunNoun()}...`,
        `Hmmmphh.`,
        `Kimochi warui. <:vigneKuzu:270818397380411393>`,
        `Baka janaino?`,
        `Doushitano?`,
        `${tool.inaAngry}`
    ];
    msg.channel.send(replies[tool.randint(replies.length)]);
}
