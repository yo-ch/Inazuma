'use strict';
const config = require('./config.json');
const commandHelp = require('./help.js');
const ani = require('./anime.js');
const tool = require('./tool.js');
const rp = require('request-promise');
const stripIndent = require('strip-indent');

module.exports = {
    'help': help,
    'andy': andy,
    'ban': ban,
    'cc': cc,
    'choose': choose,
    'gavquote': gavquote,
    'kick': kick,
    'prune': prune,
    'role': role,
    'roll': roll,
    'retrieveImgurAlbum': retrieveImgurAlbum
}

/*
Displays the general help menu, or the help text for a specific command if requested.
*/
function help(msg) {
    var args = msg.content.split(/\s+/).slice(1);

    var helpStr;
    if (args.length == 1) { //User requested help for a specific command.
        if (args[0].charAt(0) == config.prefix) //Remove prefix for the help argument.
            args[0] = args[0].slice(1);
        helpStr = commandHelp[args[0]];
    }

    if (helpStr) //Display help for requested command.
        msg.channel.send(helpStr, {
            'code': 'css'
        });
    else //Bring up default help menu.
        msg.channel.send(stripIndent(
            `
            [Help Menu]
               ~help [command]

               #Utility
                  ~airing
                  ~anilist
                  ~choose
                  ~roll
                  ~music
               #Moderation
                  ~ban
                  ~kick
                  ~prune
                  ~role
                  ~cc
               #Etc.
                  ~andy
                  ~gavquote
                  ~aoba
                  ~vigne

            [] = optional, <> = required, | = or
            `
        ), {
            'code': 'css'
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
Bans specified user provided that the caller is allowed to ban that user.
*/
function ban(msg) {
    if (!msg.member.hasPermission('BAN_MEMBERS')) {
        return msg.channel.send(`You don't have permission to ban members! ${tool.inaAngry}`);
    }
    var memberToBan = msg.mentions.members.first();
    if (memberToBan && memberToBan.bannable && (msg.member.highestRole.calculatedPosition >
            memberToBan.highestRole.calculatedPosition || msg.guild.ownerID == msg.author.id)) {
        //Parse arguments to options, if they exist.
        var reason = tool.parseOptionArg('reason', msg.content);
        var days = parseInt(tool.parseOptionArg('days', msg.content));

        var banOptions = {
            days: days ? days : 0,
            reason: reason ? reason : 'none'
        };
        memberToBan.ban(banOptions);
    }
}

/*
Kicks specified user provided that the caller is allowed to kick that user.
*/
function kick(msg) {
    if (!msg.member.hasPermission('KICK_MEMBERS')) {
        return msg.channel.send(`You don't have permission to kick members! ${tool.inaAngry}`);
    }
    var memberToKick = msg.mentions.members.first();
    if (memberToKick && memberToKick.kickable && (msg.member.highestRole.calculatedPosition >
            memberToBan.highestRole.calculatedPosition || msg.guild.ownerID == msg.author.id)) {
        var reason = tool.parseOptionArg('reason', msg.content);
        memberToKick.kick(reason ? reason : 'none');
    }
}

/*
Sets the voice channel of the mentioned user if the author of the message
has the MOVE_MEMBER permission.
*/
function cc(msg) {
    if (!msg.member.hasPermission('MOVE_MEMBERS')) {
        return msg.channel.send(`Gomen, you're not allowed to move users. ${msg.author}`);
    }
    var channel = msg.content.slice(config.prefix.length + 3, msg.content.indexOf('<@'));

    var memberToBanish = msg.mentions.members.first();
    if (memberToBanish)
        memberToBanish.setVoiceChannel(msg.guild.channels.find('name', channel.trim()));
}

/*
Chooses between 1 or more choices given by the user, delimited by '|'.
*/
function choose(msg) {
    var args = msg.content.split('|');

    args[0] = args[0].slice(8); //Slice off command string.
    var choices = args.filter(arg => { //Filter out empty/whitespace args, and trim options.
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
    var silentOption = options.short.includes('s') || options.long.includes('silent');
    var pinOption = options.short.includes('p') || options.long.includes('pinned');

    if (amount) {
        try {
            var name;
            var nickname;
            var stringToFilter;
            if (userOption) {
                name = tool.parseOptionArg('user', msg.content);
                if (!name)
                    throw 'args';
            }

            if (filterOption) {
                stringToFilter = tool.parseOptionArg('filter', msg.content);
                if (!stringToFilter)
                    throw 'args';
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
    Deletes the most recent <amount> messages in each call.
    @param {Number} amount The amount of messages to delete.
    @param {Number} prunedAmount The number of messages pruned off so far.
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
                        .indexOf(stringToFilter) >= 0 : true;
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

            /*
            Calls the next processAmount call or ends the recursion and replies with results.
            @param {Number} deletedSize The number of messages deleted in this iteration of processAmount.
            */
            function nextCall(deletedSize) {
                prunedAmount += deletedSize;
                if (amount > 0) {
                    //Delete next 100 batch of messages.
                    setTimeout(() => {
                        processAmount(amount, prunedAmount);
                    }, 1000);
                } else { //Done pruning.
                    //Total number of pruned messages.
                    if (silentOption) {
                        msg.delete();
                    } else {
                        msg.channel.send(`Pruned ${tool.wrap(prunedAmount)} messages.`);
                    }
                }
            }
        }).catch(err => {
            throw 'err';
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
    if (roles == null)
        return;
    if (roles.length === 0)
        return msg.channel.send(`Unable to find matching roles.`);


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
    Filters users for give|take functions according to the specified options.
    @param {String} type The type of role change. 'give' or 'take' operation.
    */
    function processRoleChanges(type) {
        var members = msg.guild.members;
        if (enabledOptions.user) { //This option ignores other options.
            var name = enabledOptions.user;
            var user = members.find(member => member.user.username.toLowerCase() == name.toLowerCase());

            if (user) {
                changeRoles(user, type);
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
    @param {Array|Object} users An array of users, or a single User object.
    @param {String} type The type of role change. 'give' or 'take'.
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
            }).then(() => msg.channel.send(
                `Modified roles of ${tool.wrap(users.length)} users.`));
        } else { //Single user.
            users[changeFunction](roles.filter(role => {
                return !users.roles.has(role.id) && type == 'give' ||
                    users.roles.has(role.id) && type == 'take';
            })).then(() => msg.channel.send(`Modified roles of ${tool.wrap('1')} user.`));
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
    @param {Array} roleNames The supplied names of roles.
    */
    function validateRoleChanges(roleNames) {
        var roles = [];
        for (let i = 0; i < roleNames.length; i++) {
            var roleName = roleNames[i];
            var roleObj = msg.guild.roles.find(role => role.name.toLowerCase() ==
                roleName.toLowerCase());
            if (!roleObj) return;
            var botPositionHigher = roleObj.calculatedPosition < msg.guild.me.highestRole
                .calculatedPosition;
            var userPositionHigher = roleObj.calculatedPosition < msg.member.highestRole
                .calculatedPosition ||
                msg.guild.ownerID == msg.author.id;
            if (!botPositionHigher) {
                msg.channel.send(
                    `Inazuma is in a lower or equal ranked role compared to the role you are trying to modify.`
                );
                return null;
            } else if (!userPositionHigher) {
                msg.channel.send(
                    `You are in a lower or equal ranked role compared to the role you are trying to modify.`
                );
                return null;
            } else {
                roles.push(roleObj);
            }
        }
        return roles;
    }

    /*
    Check if options and their args are valid, and also if this specific combination of options is valid.
    @param {Object} options The options parsed from the command.
    @return {Object} enabledOptions An object with key/value pairs of <option name, true|argument to the option>.

    i.e;
    if one of the options was --bots, enabledOptions.bots = true.
    if one of the options was --user <user>, enabledOptions.user = <user>.
    */
    function validateOptions(options) {
        var enabledOptions = {};

        //Validate options for 'give|take' or 'modify'.
        if (args[0] == 'give' || args[0] == 'take') {
            //Get options and their type counts.
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

            //Make sure there is a valid combo of options.
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
                if (!(enabledOptions.user = tool.parseOptionArg('user', msg.content))) {
                    msg.channel.send(`User not specified. ${tool.wrap('--user <user>')}`);
                    return null;
                }
            }
            if (enabledOptions.inrole) {
                if (enabledOptions.inrole = tool.parseOptionArg('inrole', msg.content)) {
                    if (!msg.guild.roles.exists(role => role.name.toLowerCase() ==
                            enabledOptions.inrole)) {
                        //Check that role actually exists.
                        msg.channel.send(`Gomen, I couldn't find a matching role.`)
                        return null;
                    }
                } else {
                    msg.channel.send(
                        `You didn't specify a role! ${tool.wrap('--inrole <role>')}`);
                    return null;
                }
            }
            if (enabledOptions.notinrole) {
                if (enabledOptions.notinrole = tool.parseOptionArg('notinrole', msg.content)) {
                    if (!msg.guild.roles.exists(role => role.name.toLowerCase() ==
                            enabledOptions.notinrole)) {
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
            if (!enabledOptions.name && !enabledOptions.color) {
                msg.channel.send(`You didn't specify any options.`);
                return null;
            }

            //Get option arguments.
            if (enabledOptions.name) {
                if (!(enabledOptions.name = tool.parseOptionArg('name'), msg.content)) {
                    msg.channel.send(
                        `You didn't specify a new name for the role! ${tool.wrap('--name <name>')}`
                    );
                    return null;
                }
            }
            if (enabledOptions.color) {
                var hexCode;
                if (hexCode = tool.parseOptionArg('color', msg.content)) {
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
