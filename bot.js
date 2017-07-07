const Discord = require('discord.js');
const config = require('./config.json');

const cmds = require('./commands.js');
const ani = require('./anime.js');
const music = require('./music.js');

const bot = new Discord.Client();
music(bot); //Pass client to music extension.

bot.on('ready', () => {
    console.log('Inazuma desu. Yoroshiku onegai itashimasu.\n');
    bot.user.setGame('~help');
});

bot.on('message', message => {
    if (message.author.bot) return; //Do not respond to messages from bots.

    //Replies to non-commands.
    if (message.content.toLowerCase().match(/^ay{2,}$/)) //Ayy lmao.
        message.channel.send('lmao');
    else if (message.content.toLowerCase().startsWith('same')) //same.
        message.channel.send('same');
    else if (message.content.toLowerCase().search('inazuma') >= 0) //Tehe~.
        message.channel.send('<:inaTehe:301555244330909697>');
    else if (message.content.search(':inaGanbare:') >= 0)
        message.channel.send(`Arigato! ${tool.inaHappy}`);
    else if (message.content.search('299400284906717186') >= 0) //Random reply when bot is mentioned.
        cmds.reply(message);
    else if (message.content.split(' ').length == 1 && isInt(parseInt(message.content))) //Could be input for the Anilist search function.
        ani.anilistChoose(message, parseInt(message.content));

    if (!message.content.startsWith(config.prefix)) return; //Not a command.

    //Commands.
    switch (message.content.split(/\s+/)[0]) {
        case command('help'):
        case command('tasukete'):
            return cmds.help(message);
        case command('andy'):
            return cmds.andy(message);
        case command('airing'):
            return cmds.airing(message);
        case command('ani'):
        case command('anilist'):
            return cmds.anilist(message);
        case command('cc'):
            return cmds.cc(message);
        case command('choose'):
            return cmds.choose(message);
        case command('gavquote'):
            return cmds.gavquote(message);
        case command('roll'):
            return cmds.roll(message);
        case command('vigne'):
            return cmds.vigne(message);
        case command('aoba'):
            return cmds.aoba(message);
    }
});

bot.on('guildMemberAdd', member => {
    member.guild.defaultChannel.send(`I-It's not like I wanted you to join this server or anything, ${ani.tsunNoun()}. ${member.user}`);
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
    if (config.anilist_token_expires_in <= 10 && config.anilist_token_expires_in > 0) console.log('Anilist access token has expired.');
    if (config.anilist_token_expires_in > 0) config.anilist_token_expires_in -= 10;
}
setInterval(timer, 10000);

function command(cmd) {
    return config.prefix + cmd;
}

function isInt(value) {
    var x = parseFloat(value);
    return !isNaN(value) && (x | 0) === x;
}
