'use strict';
const Discord = require('discord.js');

const config = require('./json/config.json');
const cmds = require('./commands.js');
const ani = require('./anime.js');
const music = require('./music.js');
const tool = require('./tool.js');

const bot = new Discord.Client();

bot.on('ready', () => {
    console.log('Inazuma desu. Yoroshiku onegai itashimasu.');
    console.log(`Serving ${bot.guilds.size} guilds.`);

    bot.user.setGame('~help');
    
    ani.requestMissingSchedules();
    setInterval(ani.requestMissingSchedules, 86400000); //Request every 24 hours.
});

bot.on('message', msg => {
    if (msg.author.bot || msg.channel.type != 'text')
        return; // Do not respond to messages from bots or messages that are not from guilds.

    //Replies to non-commands.
    if (msg.content.toLowerCase().match(/^ay{2,}$/)) //Ayy lmao.
        msg.channel.send('lmao');
    else if (msg.content.toLowerCase().search(/^same*$/) >= 0) //same.
        msg.channel.send('same');
    else if (msg.content.toLowerCase().indexOf('inazuma') >= 0) //Tehe~.
        msg.channel.send('<:inaTehe:301555244330909697>');
    else if (msg.content.search(':inaGanbare:') >= 0)
        msg.channel.send(`Arigato! ${tool.inaHappy}`);
    else if (msg.content.search('299400284906717186') >= 0) //Random reply when bot is mentioned.
        reply(msg);
    else if (tool.isInt(parseInt(msg.content))) //Could be input for the Anilist search function.
        ani.anilistChoose(msg, parseInt(msg.content));

    if (!msg.content.startsWith(config.prefix))
        return; //Not a command.

    let cmd = msg.content.split(/\s+/)[0].slice(config.prefix.length).toLowerCase();
    getCmdFunction(cmd)(msg);
});

bot.on('guildMemberAdd', member => {
    member.guild.channels.get(member.guild.id).send(
        `I-It's not like I wanted you to join this server or anything, ${tool.tsunNoun()}. ${member.user}`
    );
});

bot.on('guildMemberRemove', member => {
    member.guild.channels.get(member.guild.id).send(`S-Sayonara. ${member.user}`);
});

bot.on('error', (e) => console.error(e));
bot.on('warn', (e) => console.warn(e));
// bot.on('debug', (e) => console.info(e));

bot.login(config.token);

function getCmdFunction(cmd) {
    const COMMANDS = {
        'help': cmds.help,
        'tasukete': cmds.help,
        'andy': cmds.andy,
        'airing': ani.airing,
        'ani': ani.anilist,
        'anilist': ani.anilist,
        'ban': cmds.ban,
        'kick': cmds.kick,
        'cc': cmds.cc,
        'choose': cmds.choose,
        'gavquote': cmds.gavquote,
        'prune': cmds.prune,
        'role': cmds.role,
        'roll': cmds.roll,
        'vigne': cmds.retrieveImgurAlbum,
        'aoba': cmds.retrieveImgurAlbum,
        'music': music.processCommand,
    };
    return COMMANDS[cmd] ? COMMANDS[cmd] : () => {};
}

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

/*
Common Params:
@param {Object} msg The message that called the command.
*/
