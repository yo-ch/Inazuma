const Discord = require('discord.js');
const config = require('./config.json');

const cmds = require('./commands.js');
const ani = require('./anime.js');
const music = require('./music.js');
const tool = require('./tool.js');

const bot = new Discord.Client();
music(bot); //Pass client to music extension.

bot.on('ready', () => {
    console.log('Inazuma desu. Yoroshiku onegai itashimasu.\n');
    bot.user.setGame('~help');
});

bot.on('message', msg => {
    if (msg.author.bot) return; //Do not respond to messages from bots.

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
        cmds.reply(msg);
    else if (isInt(parseInt(msg.content))) //Could be input for the Anilist search function.
        ani.anilistChoose(msg, parseInt(msg.content));

    if (!msg.content.startsWith(config.prefix)) return; //Not a command.

    var cmd = msg.content.split(/\s+/)[0].slice(config.prefix.length);

    //Commands.
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
        case 'roll':
            return cmds.roll(msg);
        case 'vigne':
            return cmds.vigne(msg);
        case 'aoba':
            return cmds.aoba(msg);
    }
});

bot.on('guildMemberAdd', member => {
    member.guild.defaultChannel.send(
        `I-It's not like I wanted you to join this server or anything, ${ani.tsunNoun()}. ${member.user}`
    );
});

bot.on('guildMemberRemove', member => {
    member.guild.defaultChannel.send(`S-Sayonara. ${member.user}`);
});

//catch errors
// bot.on('error', (e) => console.error(e));
// bot.on('warn', (e) => console.warn(e));
// bot.on('debug', (e) => console.info(e));

// log our bot in
bot.login(config.token);

function timer() {
    if (ani.tokenExpiresIn <= 10)
        console.log('Anilist access token has expired.');
    if (ani.tokenExpiresIn > 0) ani.tokenExpiresIn -= 10;
}
setInterval(timer, 10000);

function isInt(value) {
    var x = parseFloat(value);
    return !isNaN(value) && (x | 0) === x;
}
