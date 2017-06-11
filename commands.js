const commands = {
    'help': '~help [command]\n   Brings up the command page. Pass a command for further information.',
    'tasukete': '~tasukete [command]\n   Brings up the command page. Pass a command for further information.',

    'andy': '~andy [@mention]\n   Shut up weeb. Mentions user, if included.',

    'airing': '~airing [options]\n   Displays the countdowns for anime in the airing list.\n\n   Options:\n      -a <anilist anime url> : Adds the given anime to the airing list.\n      -r <name in list>      : Removes the anime from the airing list.\n      -c                     : Clears the airing list.',

    'anilist': '~anilist <anime name>\n   Displays an anime\'s data, pulled from Anilist. If multiple choices are given, simply reply with the number.\n\n   alt: ~ani',

    'cc': '~cc <voice channel> <@mention>\n   Changes the mentioned user\'s voice channel to the given channel.',

    'choose': '~choose <arg1> | [arg2] ...\n   Randomly chooses between the provided choice(s).',

    'gavquote': '~gavquote\n   Returns a random Gavin quote.',

    'roll': '~roll <int1> [int2]\n   Rolls an integer from 1 to int1 inclusive.\n   If int2 is given, rolls an integer between int1 and int2 inclusive.',

    'vigne': '~vigne\n   Returns a random picture of Vigne.',

    'play': '~play <url>\n   Adds the song to the queue.',

    'skip': '~skip\n   Skips the current song.',

    'queue': '~queue\n   Displays the song queue.'
}

const config = require('./config.json');

const ani = require('./anime.js');
const music = require('./music.js');
const tool = require('./tool.js');

var searchData = '';
var anilistSearch = false;
var searchChoices = 0;
var searchClient = '';

var self = module.exports = {
    /*
    COMMANDS
    */
    help: function(msg) {
        var args = msg.content.split(' ').slice(1);
        args = args.filter((arg) => { //Filter out empty/whitespace args, and trim args.
            return arg.trim();
        });

        var cmd;
        if (args.length == 1) { //User requested help for a specific command.
            if (args[0].charAt(0) == config.prefix) //Remove prefix for the help argument.
                args[0] = args[0].slice(1);
            cmd = commands[args[0]];
        }

        if (cmd) //Display help for requested command.
            msg.channel.send(cmd, {
                'code': true
            });
        else //Bring up default help menu.
            msg.channel.send(
                '```' +
                'Commands:\n' +
                '   ~help [command]\n\n' +

                '   ~airing [options]\n' +
                '   ~anilist <anime name>\n' +
                '   ~choose <arg1> | [arg2] ...\n' +
                '   ~roll <int1> [int2]\n\n' +

                '   ~play <url>\n' +
                '   ~skip\n' +
                '   ~queue\n\n' +

                '   ~andy [@mention]\n' +
                '   ~gavquote\n' +
                '   ~vigne\n\n' +

                '   ~cc <voice channel> <@mention>' +
                '```'
            );
    },

    andy: function(msg) {
        msg.delete();
        var user = msg.mentions.users.first();
        if (user) msg.channel.send(`Shut up weeb. ${user}`);
        else
            msg.channel.send(`Shut up weeb.`)
    },

    /*
    Displays the airing list.
    Options:
      -a <url>  : Adds an anime to the airing list.
      -r <name> : Removes the anime from the airing list.
      -c        : Clears the airing list.
    */
    airing: function(msg) {
        var args = msg.content.split(' ');
        if (!args[1]) ani.retrieveAiringData(msg);
        else if (args[1] == '-a') ani.addAiringAnime(msg);
        else if (args[1] == '-r') ani.removeAiringAnime(msg);
        else if (args[1] == '-c') ani.clearAiringList(msg);
    },

    /*
    Lookup anilist data.
    */
    anilist: function(msg) {
        ani.retrieveAnilistData(msg);
    },

    /*
    Sets the voice channel of the mentioned user if the author of the message
    has the MOVE_MEMBER permission.
    */
    cc: function(msg) {
        if (msg.channel.type == 'dm') return;
        if (!msg.member.hasPermission('MOVE_MEMBERS')) {
            msg.channel.send(`Gomenasai! You\'re not allowed to move users. ${msg.author}`);
            return;
        }

        var args = msg.content.split(' ').slice(1);
        var length = args.length;
        var channel = '';
        var i;

        for (i = 0; i < length && !args[i].startsWith('<@'); i++) {
            channel += args[i] + ' ';
        }

        let userToBanish = msg.mentions.users.first();
        if (userToBanish)
            msg.guild.member(userToBanish).setVoiceChannel(msg.guild.channels.find('name', channel.trim()));
    },

    /*
    Chooses between 1 or more choices given by the user, delimited by '|'.
    */
    choose: function(msg) {
        var args = msg.content.split("|");

        args[0] = args[0].slice(8); //Slice off command string.
        var choices = args.filter((arg) => { //Filter out empty/whitespace args, and trim options.
            return arg.trim() != '';
        });

        if (choices.length >= 1)
            msg.channel.send(choices[tool.randint(choices.length)]);
        else
            msg.channel.send(`I can\'t choose if you don\'t give me any choices! <:inaAngry:302886932164116480>`);
    },

    /*
    Returns a random Gavin quote.
    */
    gavquote: function(msg) {
        let gq = require('./gavquotes.json');
        msg.channel.send(`\`\`${gq.quotes[tool.randint(gq.quotes.length)]}\`\``);
    },

    /*
    Rolls a number between 1 and num1 or num1 and num2 inclusive.
    */
    roll: function(msg) {
        var args = msg.content.split(' ').slice(1);

        if (args.length > 2) return;

        if (args.length == 1) {
            var num = parseInt(args[0]);
            if (tool.isInt(num))
                msg.channel.send(tool.randint(num) + 1);
            else
                msg.channel.send(`These aren\'t numbers ${ani.tsunNoun()}!`);
        } else {
            var num1 = parseInt(args[0]);
            var num2 = parseInt(args[1]);
            if (!tool.isInt(num1) || !tool.isInt(num2)) {
                msg.channel.send(`These aren\'t numbers ${ani.tsunNoun()}!`);
                return;
            }

            if (num1 > num2)
                msg.channel.send(tool.randint(num1 - num2 + 1) + num2);
            else
                msg.channel.send(tool.randint(num2 - num1 + 1) + num1);
        }
    },

    /*
    Interacts with the imgur API to pull a random image link from an album.
    */
    vigne: function(msg) {
        //Create a http request.
        var request = require('request');

        //api url + authorization header
        var options = {
            url: 'https://api.imgur.com/3/album/90DeF/images',
            headers: {
                'Authorization': `Client-ID ${config.imgur_id}`
            }
        };

        //Callback funct.
        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                var info = JSON.parse(body);
                msg.channel.send(info.data[tool.randint(info.data.length)].link);
            }
        }

        request(options, callback);
    },

    /*
    HELPER FUNCTIONS
    */
    reply: function(msg) {
        let replies = [
            `Nani yo?`,
            `What do you want, ${ani.tsunNoun()}...`,
            `Hmmmphh.`,
            `Kimochi warui. <:vigneKuzu:270818397380411393>`,
            `Baka janaino?`,
            `Doushitano?`,
            `<:inaAngry:302886932164116480>`
        ];
        msg.channel.send(replies[tool.randint(replies.length)]);
    }
}
