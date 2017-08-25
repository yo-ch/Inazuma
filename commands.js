'use strict';
const config = require('./config.json');
const ani = require('./anime.js');
const tool = require('./tool.js');
const rp = require('request-promise');

module.exports = {
    'help': help,
    'andy': andy,
    'airing': airing,
    'anilist': anilist,
    'cc': cc,
    'choose': choose,
    'gavquote': gavquote,
    'prune': prune,
    'roll': roll,
    'retrieveImgurAlbum': retrieveImgurAlbum
}

function help(msg) {
    var args = msg.content.split(/\s+/).slice(1);

    var helpStr;
    if (args.length == 1) { //User requested help for a specific command.
        if (args[0].charAt(0) == config.prefix) //Remove prefix for the help argument.
            args[0] = args[0].slice(1);
        helpStr = commands[args[0]];
    }

    if (helpStr) //Display help for requested command.
        msg.channel.send(helpStr, {'code': true});
    else //Bring up default help menu.
        msg.channel.send(`Commands:
   ~help [command]

   ~airing [options]
   ~anilist <anime name>
   ~choose <arg1> | [arg2] ...
   ~roll <int1> [int2]

   ~music <command>

   ~andy [@mention]
   ~gavquote

   ~aoba
   ~vigne

   ~prune <amount> [options]
   ~cc <voice channel> <@mention>

[] = optional, <> = required, | = or`, {'code': true});
    }

/*
Shut up weeb.
*/
function andy(msg) {
    msg.delete();
    var user = msg.mentions.users.first();
    if (user)
        msg.channel.send(`Shut up weeb. ${user}`);
    else
        msg.channel.send(`Shut up weeb.`)
}

/*
Processes ~airing commands.
*/
function airing(msg) {
    var args = msg.content.split(/\s+/);
    if (!args[1])
        ani.retrieveAiringData(msg);
    else if (args[1] == 'a')
        ani.addAiringAnime(msg);
    else if (args[1] == 'r')
        ani.removeAiringAnime(msg);
    else if (args[1] == 'c')
        ani.clearAiringList(msg);
    }

/*
Lookup anime data.
*/
function anilist(msg) {
    ani.retrieveAnilistData(msg);
}

/*
Sets the voice channel of the mentioned user if the author of the message
has the MOVE_MEMBER permission.
*/
function cc(msg) {
    if (!msg.member.hasPermission('MOVE_MEMBERS')) {
        msg.channel.send(`Gomenasai! You\'re not allowed to move users. ${msg.author}`);
        return;
    }

    var args = msg.content.split(/\s+/).slice(1);
    var length = args.length;
    var channel = '';
    var i;

    for (i = 0; i < length && !args[i].startsWith('<@'); i++) {
        channel += args[i] + ' ';
    }

    var userToBanish = msg.mentions.users.first();
    if (userToBanish)
        msg.guild.member(userToBanish).setVoiceChannel(msg.guild.channels.find('name', channel.trim()));
    }

/*
Chooses between 1 or more choices given by the user, delimited by '|'.
*/
function choose(msg) {
    var args = msg.content.split("|");

    args[0] = args[0].slice(8); //Slice off command string.
    var choices = args.filter((arg) => { //Filter out empty/whitespace args, and trim options.
        return arg.trim() != '';
    });

    if (choices.length >= 1)
        msg.channel.send(choices[tool.randint(choices.length)]);
    else
        msg.channel.send(`I can\'t choose if you don\'t give me any choices! ${tool.inaAngry}`);
    }

/*
Returns a random Gavin quote.
*/
function gavquote(msg) {
    var gq = require('./gavquotes.json');
    msg.channel.send(`${tool.wrap(gq.quotes[tool.randint(gq.quotes.length)])}`);
}

/*
Prunes the specified number of messages from a channel.
*/
function prune(msg) {
    if (!msg.member.hasPermission('MANAGE_MESSAGES'))
        return;
    var args = msg.content.split(/\s+/);
    var amount = parseInt(args[1]);

    if (amount < 2 || amount > 100)
        return msg.channel.send(`Give me an amount between 2 and 100, onegai.`);

    var options = tool.parseOptions(msg.content);

    var bot = options.long.includes('bots');
    var pin = options.short.includes('p') || options.long.includes('pinned');

    if (tool.isInt(amount)) {
        amount = amount < 100
            ? amount + 1
            : amount; //Add extra to account for not deleting the prune command.
        try {
            msg.channel.fetchMessages({limit: amount}).then(msgs => {
                var msgsToDelete;
                if (bot) {
                    msgsToDelete = msgs.filterArray(msg => {
                        return msg.author.bot;
                    });
                } else {
                    msgsToDelete = msgs.array().slice(1) //Slice off command.;
                }

                if (!pin) { //Filter pinned messages out.
                    msgsToDelete = msgsToDelete.filter(msg => {
                        return !msg.pinned;
                    });
                }

                if (msgsToDelete.length >= 2) {
                    msg.channel.bulkDelete(msgsToDelete, true).then(deleted => {
                        msg.channel.send(`Pruned ${tool.wrap(deleted.size)} messages.`);
                    });
                } else if (msgsToDelete.length == 1) {
                    msgsToDelete[0].delete().then(deleted => {
                        msg.channel.send(`Pruned ${tool.wrap('1')} message.`);
                    });
                } else {
                    msg.channel.send(`There were no messages to prune.`);
                }
            }).catch(() => {
                throw 'err';
            });
        } catch (err) {
            msg.channel.send(`Gomen, I couldn't delete your messages. ${tool.inaError}`);
        }
    }
}

/*
Rolls a number between 1 and num1 or num1 and num2 inclusive.
*/
function
roll(msg) {
    var args = msg.content.split(/\s+/).slice(1);
    if (args.length > 2)
        return;

    if (args.length == 1) {
        var num = parseInt(args[0]);
        if (tool.isInt(num))
            msg.channel.send(tool.randint(num) + 1);
        else
            msg.channel.send(`These aren\'t numbers ${tool.tsunNoun()}!`);
        }
    else {
        var num1 = parseInt(args[0]);
        var num2 = parseInt(args[1]);
        if (!tool.isInt(num1) || !tool.isInt(num2))
            return
        msg.channel.send(`These aren\'t numbers ${tool.tsunNoun()}!`);

        if (num1 > num2)
            msg.channel.send(tool.randint(num1 - num2 + 1) + num2);
        else
            msg.channel.send(tool.randint(num2 - num1 + 1) + num1);
        }
    }

/*
Interacts with the imgur API to pull a random image link from an album.
*/
function
retrieveImgurAlbum(msg) {
    const albums = {
        'aoba': '4e3Dd',
        'vigne': '90DeF'
    }
    var album = albums[msg.content.slice(config.prefix.length)];
    var options = {
        url: `https://api.imgur.com/3/album/${album}/images`,
        headers: {
            'Authorization': `Client-ID ${config.imgur_id}`
        }
    };

    rp(options).then(body => {
        var info = JSON.parse(body);
        msg.channel.send(info.data[tool.randint(info.data.length)].link);
    });
}

const commands = {
    'help': `~help [command]
  Brings up the command page. Pass a command for further information.`,
    'tasukete': `~tasukete [command]
  Brings up the command page. Pass a command for further information.`,

    'andy': `~andy [@mention]
  Shut up weeb. Mentions user, if included.`,

    'aoba': `~aoba
  Returns a random picture of Aoba.`,

    'airing': `~airing [option]
  Displays countdowns until the next episode for each anime in your airing list.

    Options:
      a <anilist urls> : Adds the given anime to your airing list.
      r <name in list> : Removes the anime from your airing list.
      c                : Clears your airing list.`,

    'anilist': `~anilist | ~ani <anime name>
  Displays an anime\'s data, pulled from Anilist.
  If multiple choices are given, simply reply with the number.`,

    'cc': `~cc <voice channel> <@mention>
  Changes the mentioned user\'s voice channel to the given channel.`,

    'choose': `~choose <arg1> | [arg2] ...
  Randomly chooses between the provided choice(s).`,

    'gavquote': `~gavquote
  Returns a random Gavin quote.`,

    'prune': `~prune <amount> [options]
  Prunes the last <amount> messages.

  Options:
    [--bots]        : Prunes only bot messages.
    [--pinned | -p] : Also prunes pinned messages. (They are not pruned by default.)`,

    'roll': `~roll <int1> [int2]
  Rolls an integer from 1 to int1 inclusive.
  If int2 is given, rolls an integer between int1 and int2 inclusive.`,

    'vigne': `~vigne
  Returns a random picture of Vigne.`,

    'music': `~music | m <command>:
   play <url> | <search> : Adds the song/playlist to the queue.
   skip                  : Skips the current song.
   pause                 : Pauses the song.
   resume                : Resumes the song.

   queue                 : Displays the song queue.
   purge                 : Clears the song queue.
   np                    : Displays the title of the current song.

   vol | v <0-100>       : Sets volume.

   join                  : Joins your voice channel.
   leave                 : Leaves voice channel.

Requires a #music text channel.`
}
