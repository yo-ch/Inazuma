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
    'role': role,
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
        msg.channel.send(helpStr, {
            'code': 'css'
        });
    else //Bring up default help menu.
        msg.channel.send(
            `Commands:
   ~help [command]

   ~airing
   ~anilist
   ~choose
   ~roll

   ~music

   ~andy
   ~gavquote

   ~aoba
   ~vigne

   ~prune
   ~role
   ~cc

[] = optional, <> = required, | = or`, {
                'code': 'prolog'
            });
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

    if (args.length == 1)
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
        msg.channel.send(`Gomen, you're not allowed to move users. ${msg.author}`);
        return;
    }
    var channel = msg.content.slice(config.prefix.length + 3, msg.content.indexOf('<@'));

    var userToBanish = msg.mentions.users.first();
    if (userToBanish)
        msg.guild.member(userToBanish).setVoiceChannel(msg.guild.channels.find('name', channel.trim()));
}

/*
Chooses between 1 or more choices given by the user, delimited by '|'.
*/
function choose(msg) {
    var args = msg.content.split('|');

    args[0] = args[0].slice(8); //Slice off command string.
    var choices = args.filter((arg) => { //Filter out empty/whitespace args, and trim options.
        return arg.trim() != '';
    });

    if (choices.length >= 1)
        msg.channel.send(choices[tool.randint(choices.length)]);
    else
        msg.channel.send(`I can't choose if you don't give me any choices! ${tool.inaAngry}`);
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
        return msg.channel.send(`You don't have permission to manage messages.`);
    var args = msg.content.split(/\s+/);
    var amount;
    if (args.length > 1) {
        amount = parseInt(args[1]);
    } else {
        msg.content = '~help prune';
        return help(msg);
    }

    if (amount < 1 || amount > 500)
        return msg.channel.send(`Give me an amount between 1 and 500, onegai.`);

    var options = tool.parseOptions(msg.content);

    var botOption = options.long.includes('bots');
    var userOption = options.long.includes('user');
    var filterOption = options.long.includes('filter');
    var pinOption = options.short.includes('p') || options.long.includes('pinned');

    if (amount) {
        try {
            var name;
            var nickname;
            if (userOption) {
                var matchUser = msg.content.match(/ --user (\w+)/);
                if (!matchUser)
                    throw 'args';
                name = matchUser[1].toLowerCase().trim();
            }
            var stringToFilter;
            if (filterOption) {
                var matchFilter = msg.content.match(/--filter (.+)/);
                if (!matchFilter)
                    throw 'args';
                var nextArgIndex = matchFilter[1].indexOf('-') > 0 ? matchFilter[1].indexOf('-') :
                    matchFilter[1].length;
                stringToFilter = matchFilter[1].toLowerCase().slice(0,
                    nextArgIndex).trim();
            }
            processAmount(amount, 0);
        } catch (err) {
            if (err.message == 'err')
                msg.channel.send(`Gomen, I couldn't delete your messages. ${tool.inaError}`);
            else //err.message == 'args'
                msg.channel.send(`Invalid syntax. Please check ${tool.wrap('~help prune')}.`)
        }
    }

    /*
    Recursive function to fetch and delete more than 100 messages if needed.
    */
    function processAmount(amount, prunedAmount) {
        var fetchAmount;

        if (amount > 100)
            fetchAmount = 100;
        else if (amount > 1)
            fetchAmount = amount;
        else
            fetchAmount = 2; //Set to 2 to account for fetchMessage lower limit.

        msg.channel.fetchMessages({
            limit: fetchAmount,
            before: msg.id
        }).then(msgs => {
            if (amount == 1) //Delete unneeded message.
                msgs.delete(msgs.lastKey());
            amount -= 100;

            if (options.long.length > 0 || options.short.length > 0) {
                msgs = msgs.filter(msg => {
                    //Evaluate filter if option enabled, else default to true, since we aren't filtering for it.
                    if (msg.member.nickname) {
                        nickname = msg.member.nickname.toLowerCase();
                    }

                    var botPass = botOption ? msg.author.bot : true;
                    var userPass = userOption ? msg.author.username.toLowerCase() ==
                        name || nickname == name : true;
                    var filterPass = filterOption ? msg.content.toLowerCase()
                        .indexOf(
                            stringToFilter) >= 0 : true;
                    var pinnedPass = pinOption ? !msg.pinned : true;

                    return botPass && userPass && filterPass &&
                        pinnedPass;
                });
            }

            if (msgs.size >= 2) {
                msg.channel.bulkDelete(msgs, true).then(deleted => {
                    nextCall(deleted.size);
                }).catch(() => {
                    //all messages that were to be bulk deleted are older than 2 weeks
                    nextCall(0);
                });
            } else if (msgs.size == 1) {
                msgs.first().delete().then(deleted => {
                    nextCall(1);
                });
            } else {
                nextCall(0);
            }

            function nextCall(deletedSize) {
                prunedAmount += deletedSize;
                if (amount > 0) {
                    //Delete next 100 batch of messages.
                    setTimeout(() => {
                        processAmount(amount, prunedAmount);
                    }, 1000);
                } else { //Done pruning.
                    //Total number of pruned messages.
                    msg.channel.send(`Pruned ${tool.wrap(prunedAmount)} messages.`);
                }
            }
        }).catch(err => {
            throw err.message;
        });
    }
}

/*
Role interface.
*/
function role(msg) {
    if (!msg.guild.available) return;
    if (!msg.member.hasPermission('MANAGE_ROLES')) {
        return msg.channel.send(`You don't have permission to manage roles. ${tool.inaBaka}`);
    }

    var args = msg.content.split(/\s+/).slice(1);
    if (args.length < 1 || (args[0] != 'give' && args[0] != 'take' && args[0] != 'modify')) {
        return msg.channel.send(
            `Invalid arguments. Please refer to ${tool.wrap('~help role')}.`);
    }

    //Function params.
    var enabledOptions;
    var roles;

    var roleNames = args[1].split(',');
    if (roleNames.length == 0) {
        return msg.channel.send(`You haven't specified any roles to give or take.`);
    }
    roles = validateRoleChanges(roleNames);
    if (roles.length == 0) {
        return msg.channel.send(`Unable to find matching roles.`);
    }

    var options = tool.parseOptions(msg.content);
    if (options) {
        enabledOptions = validateOptions(options);
        if (!enabledOptions) return;
    }
    switch (args[0]) {
        case 'give':
            return processRoleChanges('give');
        case 'take':
            return processRoleChanges('take');
        case 'modify':
            if (roles.length == 1)
                modifyRole();
            else
                return;
            break;
    }

    /*
    Filters users for give|take functions according to the specified optinos.
    */
    function processRoleChanges(type) {
        var members = msg.guild.members;
        if (enabledOptions.user) { //This option ignores other options.
            var name = enabledOptions.user;
            var user = members.find(member => member.user.username.toLowerCase() == name.toLowerCase());

            if (user) {
                changeRoles(user, roles, type);
            } else {
                msg.channel.send(`Unable to find matching user.`);
            }
            return;
        }

        var membersToChange = members.array();
        if (enabledOptions.bots) {
            membersToChange = membersToChange.filter(member => {
                return member.user.bot;
            });
        } else if (enabledOptions.users) {
            membersToChange = membersToChange.filter(member => {
                return !member.user.bot;
            });
        }

        if (enabledOptions.inrole) {
            var roleName = enabledOptions.inrole;
            membersToChange = membersToChange.filter(member => {
                return member.roles.exists(role => role.name.toLowerCase() ==
                    roleName); //Has specified role.
            });
        } else if (enabledOptions.notinrole) {
            var roleName = enabledOptions.notinrole;
            membersToChange = membersToChange.filter(member => {
                return !member.roles.exists(role => role.name.toLowerCase() ==
                    roleName); //Doesn't have specified role.
            });
        } else if (enabledOptions.noroles) {
            membersToChange = membersToChange.filter(member => {
                return member.roles.size == 1; //Only has @everyone role.
            });
        }
        changeRoles(membersToChange, type);
    }

    /*
    Add/remove roles for each user.
    */
    function changeRoles(users, type) {
        //If type != 'give', type = 'take'.
        var changeFunction = type == 'give' ? 'addRoles' : 'removeRoles';

        /*
          Filter according to change type.
          Make sure user doesn't have role if adding roles. ('give')
          Make sure user has role if removing roles. ('take')
        */
        if (Array.isArray(users)) { //Multiple users.
            users.forEach(user => {
                user[changeFunction](roles.filter(role => {
                    return !user.roles.has(role.id) && type == 'give' ||
                        user.roles.has(role.id) && type == 'take';
                }));
            });
            msg.channel.send(`Modified roles of ${tool.wrap(users.length)} users.`);
        } else { //Single user.
            users[changeFunction](roles.filter(role => {
                return !users.roles.has(role.id) && type == 'give' ||
                    users.roles.has(role.id) && type == 'take';
            }));
            msg.channel.send(`Modified roles of ${tool.wrap('1')} user.`);
        }
    }

    /*
    Changes the name or colour of the specified role.
    */
    function modifyRole() {
        var role = roles[0];
        if (enabledOptions.name) {
            role.setName(enabledOptions.name);
        }
        if (enabledOptions.color) {
            role.setColor(enabledOptions.color);
        }
        msg.channel.send(`The role ${tool.wrap(role.name)} has been modified.`);
    }

    /*
    Validate that the bot and user have permission to modify/assign the specified roles.
    */
    function validateRoleChanges(roleNames) {
        var roles = [];
        roleNames.forEach(roleName => {
            var roleObj = msg.guild.roles.find(role => role.name.toLowerCase() ==
                roleName.toLowerCase().trim());
            if (!roleObj) return;
            var botPositionHigher = roleObj.calculatedPosition < msg.guild.me.highestRole
                .calculatedPosition;
            var userPositionHigher = roleObj.calculatedPosition < msg.member.highestRole
                .calculatedPosition ||
                msg.guild.ownerID == msg.author.id;
            if (!botPositionHigher)
                msg.channel.send(
                    `Inazuma is in a lower or the same ranked role compared to the role you are trying to modify.`
                );
            else if (!userPositionHigher)
                msg.channel.send(
                    `You are in a lower or same ranked role compared to the role you are trying to modify.`
                );
            else
                roles.push(roleObj);
        })
        return roles;
    }

    /*
    Validates the options of the command and gets their arguments if applicable.
    enabledOptions stores included options as properties, as 'true' or as the corresponding argument to the option.

    i.e;
    if one of the options was --bots, enabledOptions.bots = true.
    if one of the options was --user <user>, enabledOptions.user = <user>.
    */
    function validateOptions(options) {
        var enabledOptions = {};

        //Validate options for 'give|take' or 'modify'.
        if (args[0] == 'give' || args[0] == 'take') {
            //Get options.
            var optionCounter = {
                type1: {},
                type2: {}
            }
            for (let i = 0; i < options.long.length; i++) {
                if (options.long[i] == 'bots' || options.long[i] == 'users' || options.long[i] ==
                    'user') {
                    optionCounter.type1[options.long[i]] = true;
                } else if (options.long[i] == 'inrole' || options.long[i] == 'notinrole' ||
                    options.long[
                        i] ==
                    'noroles') {
                    optionCounter.type2[options.long[i]] = true;
                }
                enabledOptions[options.long[i]] = true;
            }

            //Make sure options selected are valid, and that there are no conflicting options.
            var optionLength1 = Object.keys(optionCounter.type1).length;
            var optionLength2 = Object.keys(optionCounter.type2).length;
            if (optionLength1 > 1) {
                msg.channel.send(
                    `You may only use one of ${tool.wrap('--bots, --users, --user')} ${tool.inaBaka}`
                );
                return null;
            }
            if (optionLength2 > 1) {
                msg.channel.send(
                    `You may only use one of ${tool.wrap('--inrole, --notinrole, --noroles')} ${tool.inaBaka}`
                );
                return null;
            }
            if (optionLength1 == 0 && optionLength2 == 0) {
                msg.channel.send(`You didn't specify any options.`);
                return null;
            }

            //Get arguments for options that take arguments.
            if (enabledOptions.user) {
                var nameMatch = msg.content.match(/ --user (\w+)/);
                if (nameMatch) {
                    var nextArgIndex = tool.getNextArgIndex(nameMatch[1]);
                    enabledOptions.user = nameMatch[1].slice(0, nextArgIndex).trim().toLowerCase();
                } else {
                    msg.channel.send(`User not specified. ${tool.wrap('--user <user>')}`);
                    return null;
                }
            }
            if (enabledOptions.inrole) {
                var roleMatch = msg.content.match(/ --inrole (\w+)/);
                if (roleMatch) {
                    var nextArgIndex = tool.getNextArgIndex(roleMatch[1]);
                    enabledOptions.inrole = roleMatch[1].slice(0, nextArgIndex).trim().toLowerCase();
                    if (!msg.guild.roles.exists(role => role.name.toLowerCase() == enabledOptions.inrole)) {
                        //Check that role actually exists.
                        msg.channel.send(`Gomen, I couldn't find a matching role.`)
                        return null;
                    }
                } else {
                    msg.channel.send(`You didn't specify a role! ${tool.wrap('--inrole <role>')}`);
                    return null;
                }
            }
            if (enabledOptions.notinrole) {
                var roleMatch = msg.content.match(/ --notinrole (\w+)/);
                if (roleMatch) {
                    var nextArgIndex = tool.getNextArgIndex(roleMatch[1]);
                    enabledOptions.notinrole = roleMatch[1].slice(0, nextArgIndex).trim().toLowerCase();
                    if (!msg.guild.roles.exists(role => role.name.toLowerCase() == enabledOptions.notinrole)) {
                        //Check that role actually exists.
                        msg.channel.send(`Gomen, I couldn't find a matching role.`)
                        return null;
                    }
                } else {
                    msg.channel.send(
                        `You didn't specify a role! ${tool.wrap('--notinrole <role>')}`);
                    return null;
                }
            }
        } else { // (args[0] == 'modify')
            //Get options and make sure at least one option was specified.
            for (let i = 0; i < options.long.length; i++) {
                enabledOptions[options.long[i]] = true;
            }
            if (!enabledOptions.name && !enabledOptions.colo) {
                msg.channel.send(`You didn't specify any options.`);
                return null;
            }

            //Get option arguments.
            if (enabledOptions.name) {
                var nameMatch = msg.content.match(/ --name (.+)/);
                if (nameMatch) {
                    var nextArgIndex = tool.getNextArgIndex(nameMatch[1]);
                    enabledOptions.name = nameMatch[1].slice(0, nextArgIndex).trim().toLowerCase();
                } else {
                    msg.channel.send(
                        `You didn't specify a new name for the role! ${tool.wrap('--name <name>')}`
                    );
                    return null;
                }
            }
            if (enabledOptions.color) {
                var colorMatch = msg.content.match(/ --color (.+)/);
                if (colorMatch) {
                    var nextArgIndex = tool.getNextArgIndex(roleMatch[1]);
                    var hexCode = colorMatch[1].slice(0, nextArgIndex).trim().toUpperCase();
                    if (hexCode.indexOf('#') == 0) hexCode = hexCode.slice(1);
                    var decimalCode = parseInt(hexCode, 16);
                    if (hexCode.length != 6 || isNaN(decimalCode)) {
                        msg.channel.send(`Invalid hex code!`);
                        return null;
                    }
                    enabledOptions.color = hexCode;
                } else {
                    msg.channel.send(
                        `You didn't specify a color! ${tool.wrap('--color <color>')}`
                    );
                    return null;
                }
            }
        }
        return enabledOptions;
    }
}

/*
Rolls a number between 1 and num1 or num1 and num2 inclusive.
*/
function roll(msg) {
    var args = msg.content.split(/\s+/).slice(1);
    if (args.length > 2)
        return;

    if (args.length == 1) {
        var num = parseInt(args[0]);
        if (tool.isInt(num))
            msg.channel.send(tool.randint(num) + 1);
        else
            msg.channel.send(`These aren\'t numbers ${tool.tsunNoun()}!`);
    } else {
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
function retrieveImgurAlbum(msg) {
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
     [--bots]            : Only prunes bot messages.
     [--user <name>]     : Only prunes messages by the specified user.
     [--filter <string>] : Only prunes messages with the specified string.

     [--pinned | -p]     : Also prunes pinned messages.`,

    'role': `[Role Help]

~role give <role[,...]> : Gives role.
~role take <role[,...]> : Removes role.
~role modify <role>     : Modifies a role.

#Options
give|take
   [--bots]              : Only change roles for bots.
   [--users]             : Only change roles for users.
   [--user <user[,...]>] : Only change roles for specified users.

   [--inrole <role>]     : Change roles for everyone with the role.
   [--notinrole <role>]  : Change roles for everyone without the role.
   [--noroles]           : Change roles for everyone with no roles.

modify
   [--name <name>]       : Rename role.
   [--color <color>]     : Change role color. (6 digit HEX)`,

    'roll': `~roll <int1> [int2]
  Rolls an integer from 1 to int1 inclusive.
  If int2 is given, rolls an integer between int1 and int2 inclusive.`,

    'vigne': `~vigne
  Returns a random picture of Vigne.`,

    'music': `[Music Help]

~music | m <command>:
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
