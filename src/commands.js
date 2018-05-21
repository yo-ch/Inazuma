/*
Regular commands.
*/
'use strict';
const kuroshiro = require('kuroshiro');
const mongoose = require('mongoose');
const rp = require('request-promise');

const config = require('./json/config.json');
const commandHelp = require('./help.js');
const tool = require('./tool.js');
const ani = require('./anime.js');
const music = require('./music.js');

//Schema for self assignable roles.
let sarSchema = new mongoose.Schema({ guildID: Number, sars: Array });
let SAR = mongoose.model('sar', sarSchema);

kuroshiro.init(err => { if (err) console.log(err) }); //For weebify.

module.exports = {
    'help': help,
    'tasukete': help,
    'andy': andy,
    'airing': ani.airing,
    'ani': ani.anilist,
    'anilist': ani.anilist,
    'ban': ban,
    'kick': kick,
    'cc': cc,
    'choose': choose,
    'gavquote': gavquote,
    'prune': prune,
    'role': role,
    'roll': roll,
    'music': music.processCommand,
    'm': music.processCommand,
    'weebify': weebify,
    'sar': sarInterface,
    'roleme': roleMe
}

/*
Displays the general help menu, or the help text for a specific command if requested.
*/
function help(msg) {
    let args = msg.content.split(/\s+/).slice(1);

    let helpStr;
    if (args.length === 1) { //User requested help for a specific command.
        if (args[0].charAt(0) === config.prefix) //Remove prefix for the help argument.
            args[0] = args[0].slice(1);
        helpStr = commandHelp[args[0]];
    }

    helpStr = helpStr ? helpStr : commandHelp['default'];
    msg.channel.send(helpStr, {
        'code': 'css'
    });
}

/*
Shut up weeb.
*/
function andy(msg) {
    msg.delete();
    let user = msg.mentions.users.first();
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
        return msg.channel.send(`You don't have permission to ban members!`);
    }
    let memberToBan = msg.mentions.members.first();
    if (memberToBan && memberToBan.bannable && (msg.member.highestRole.calculatedPosition >
            memberToBan.highestRole.calculatedPosition || msg.guild.ownerID === msg.author.id)) {
        //Parse arguments to options, if they exist.
        let reason = tool.parseOptionArg('reason', msg.content);
        let days = parseInt(tool.parseOptionArg('days', msg.content));

        let banOptions = {
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
        return msg.channel.send(`You don't have permission to kick members!`);
    }
    let memberToKick = msg.mentions.members.first();
    if (memberToKick && memberToKick.kickable && (msg.member.highestRole.calculatedPosition >
            memberToKick.highestRole.calculatedPosition || msg.guild.ownerID === msg.author.id)) {
        let reason = tool.parseOptionArg('reason', msg.content);
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
    let channel = msg.content.slice(config.prefix.length + 3, msg.content.indexOf('<@'));
    let memberToBanish = msg.mentions.members.first();
    if (memberToBanish)
        memberToBanish.setVoiceChannel(msg.guild.channels.find('name', channel.trim()));
}

/*
Chooses between 1 or more choices given by the user, delimited by '|'.
*/
function choose(msg) {
    let args = msg.content.split('|');

    args[0] = args[0].slice(8); //Slice off command string.
    let choices = args.filter(arg => { //Filter out empty/whitespace args, and trim options.
        return arg.trim() != '';
    });

    if (choices.length >= 1)
        msg.channel.send(choices[tool.randInt(choices.length)]);
    else
        msg.channel.send(`I can't choose if you don't give me any choices!`);
}

/*
Returns a random Gavin quote.
*/
function gavquote(msg) {
    let gq = require('./json/gavquotes.json');
    msg.channel.send(`${tool.wrap(gq.quotes[tool.randInt(gq.quotes.length)])}`);
}

/*
Prunes the specified number of messages from a channel.
*/
function prune(msg) {
    if (!msg.member.hasPermission('MANAGE_MESSAGES'))
        return msg.channel.send(`You don't have permission to manage messages.`);
    let args = msg.content.split(/\s+/);
    let amount;
    if (args.length > 1) {
        amount = parseInt(args[1]);
    } else {
        msg.content = '~help prune';
        return help(msg);
    }

    if (amount < 1 || amount > 500)
        return msg.channel.send(`Give me an amount between 1 and 500, onegai.`);

    let options = tool.parseOptions(msg.content);

    let botOption = options['bots'];
    let userOption = options['user'];
    let filterOption = options['filter'];
    let silentOption = options['s'] || options['silent'];
    let pinOption = options['p'] || options['pinned'];

    let name;
    let nickname;
    let stringToFilter;
    try {
        if (amount) {
            if (userOption) {
                name = tool.parseOptionArg('user', msg.content);
                if (!name) {
                    throw 'args';
                }
            }

            if (filterOption) {
                stringToFilter = tool.parseOptionArg('filter', msg.content);
                if (!stringToFilter) {
                    throw 'args';
                }
            }
        }
    } catch (err) {
        if (err.message === 'err') {
            msg.channel.send(`Gomen, I couldn't delete your messages.`);
        } else { //err.message === 'args'
            msg.channel.send(`Invalid syntax. Please check ${tool.wrap('~help prune')}.`);
        }
    }

    processAmount(amount);

    /*
    Recursive function to fetch and delete more than 100 messages if needed.
    Deletes the most recent <amount> messages in each call.
    @param {Number} amount The amount of messages to delete.
    @param {Number} prunedAmount The number of messages pruned off so far.
    */
    function processAmount(amount, prunedAmount = 0) {
        let fetchAmount;
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
            if (amount === 1) //Delete unneeded message.
                msgs.delete(msgs.lastKey());
            amount -= 100;

            if (Object.keys(options).length > 0) {
                msgs = msgs.filter(msg => {
                    //Evaluate filter if option enabled, else default to true, since we aren't filtering for it.
                    if (msg.member.nickname) {
                        nickname = msg.member.nickname.toLowerCase();
                    }

                    let botPass = botOption ? msg.author.bot : true;
                    let userPass = userOption ? msg.author.username.toLowerCase() ===
                        name || nickname === name : true;
                    let filterPass = filterOption ? msg.content.toLowerCase()
                        .indexOf(stringToFilter) >= 0 : true;
                    let pinnedPass = pinOption ? !msg.pinned : true;

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
            } else if (msgs.size === 1) {
                msgs.first().delete().then(() => {
                    nextCall(1);
                });
            } else {
                nextCall(0);
            }
        }).catch(() => {
            throw 'err';
        });

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
    }
}

/*
Role interface.
*/
function role(msg) {
    if (!msg.guild.available) return;
    if (!msg.member.hasPermission('MANAGE_ROLES')) {
        return msg.channel.send(`You don't have permission to manage roles.`);
    }

    let args = msg.content.split(/\s+/).slice(1);
    let funct = args[0];

    if (!['give', 'take', 'modify'].includes(funct)) {
        return msg.channel.send(`Invalid function. Please refer to ${tool.wrap('~help role')}.`);
    }

    let roles = getRoleObjects(args[1].split(','));
    if (roles === null) {
        return;
    } else if (!roles.length) {
        return msg.channel.send('No matching roles were found. Perhaps you mispelled a role?');
    }

    let options = tool.parseOptions(msg.content);
    if (Object.keys(options).length === 0 || !validOptions(funct, options)) {
        return msg.channel.send('Invalid arguments.');
    }

    switch (funct) {
        case 'give':
            return processRoleChange(roles, 'give', options);
        case 'take':
            return processRoleChange(roles, 'take', options);
        case 'modify':
            if (roles.length === 1) {
                modifyRole(roles[0]);
            } else {
                msg.channel.send('You can only modify one role at a time.');
            }
            break;
    }

    /*
    Validate that the bot and user have permission to modify/assign the specified roles, and then return
    the corresponding Role objects.
    @param {Array} roleNames The supplied names of roles.
    @return {Role} The Role objects corresponding to the params.
    */
    function getRoleObjects(roleNames) {
        let roles = [];
        for (let roleName of roleNames) {
            let roleObj = msg.guild.roles.find(role => role.name.toLowerCase() === roleName.toLowerCase());
            if (!roleObj) {
                continue;
            }

            //Check if the bot has higher role than the role to modify.
            let botPositionHigher = msg.guild.me.highestRole.calculatedPosition > roleObj.calculatedPosition;
            //Check if the user has a higher role than the role to modify.
            let userPositionHigher = msg.member.highestRole.calculatedPosition > roleObj.calculatedPosition ||
                msg.guild.ownerID === msg.author.id;

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
            } else if (roleObj.managed) {
                msg.channel.send(
                    `The role you are trying to assign is externally managed.`
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
    @param {String} funct The role function to perform.
    @param {Object} options The options parsed from the command.
    @return {Boolean}
    */
    function validOptions(funct, options) {
        //Validate options for 'give|take' or 'modify'.
        if ((args[0] === 'give' || args[0] === 'take') && validOptionCombo('givetake')) {
            if (options.hasOwnProperty('user') && !options['user']) {
                msg.channel.send(`You didn't specify a user! ${tool.wrap('--user <user>')}.`);
                return false;
            } else if (options.hasOwnProperty('inrole')) {
                //Role not supplied.
                if (!options['inrole']) {
                    msg.channel.send(
                        `You didn't specify a role! ${tool.wrap('--inrole <role>')}.`);
                    return false;
                }

                //Make sure the role exists.
                if (!msg.guild.roles.exists(role => role.name.toLowerCase() ===
                        options['inrole'])) {
                    msg.channel.send(`Gomen, I couldn't find a matching role.`)
                    return false;
                }
            } else if (options.hasOwnProperty('notinrole')) {
                if (!options['notinrole']) {
                    msg.channel.send(
                        `You didn't specify a role! ${tool.wrap('--notinrole <role>')}`);
                    return false;
                }

                //Check that role actually exists.
                if (!msg.guild.roles.exists(role => role.name.toLowerCase() ===
                        options['notinrole'])) {
                    msg.channel.send(`Gomen, I couldn't find a matching role.`)
                    return false;
                }
            }

            return true;
        } else if (args[0] === 'modify' && validOptionCombo('modify')) {
            if (options.hasOwnProperty('name') && !options['name']) {
                msg.channel.send(
                    `You didn't specify a new name for the role! ${tool.wrap('--name <name>')}`
                );
                return false;
            } else if (options.hasOwnProperty('color')) {
                if (!options['color']) {
                    msg.channel.send(
                        `You didn't specify a color! ${tool.wrap('--color <color>')}`
                    );
                    return false;
                }

                if (options['color'].indexOf('#') === 0) {
                    options['color'] = options['color'].slice(1);
                }
                if (options['color'].length != 6 || isNaN(parseInt(options['color'], 16))) {
                    msg.channel.send(`Invalid hex code!`);
                    return false;
                }
            }

            return true;
        } else {
            return false;
        }
    }


    /*
    Checks if the combination of options is valid.
    @param {String} type The type of options to check. 'givetake'|'modify'
    @return {Boolean} true if valid, false otherwise
    */
    function validOptionCombo(options, type) {
        if (type === 'givetake') {
            if (Object.keys(options).length === 0) {
                msg.channel.send(`You didn't specify any options, ${tool.tsunNoun()}!`);
                return false;
            }

            let optionCount1 = 0;
            let optionCount2 = 0;

            for (let option in options) {
                if (['bots', 'users', 'user'].includes(option)) {
                    optionCount1++;
                } else if (['inrole', 'notinrole', 'noroles'].includes(option)) {
                    optionCount2++;
                }
            }

            if (optionCount1 > 1) {
                msg.channel.send(`You may only use one of ${tool.wrap('--bots, --users, --user')}.`);
                return false;
            }
            if (optionCount2 > 1) {
                msg.channel.send(
                    `You may only use one of ${tool.wrap('--inrole, --notinrole, --noroles')}.`
                );
                return false;
            }
        } else if (type === 'modify') {
            if (!options.hasOwnProperty('name') && !options.hasOwnProperty('color')) {
                msg.channel.send(`You didn't specify any options, ${tool.tsunNoun()}!`);
                return false;
            }
        }

        return true;
    }

    /*
    Filters users for give|take functions according to the specified options.
    @param {String} type The type of role change. 'give' or 'take' operation.
    */
    function processRoleChange(roles, type, options) {
        let members = msg.guild.members;
        if (options.hasOwnProperty('user')) { //This option ignores other options.
            let names = options['user'].split(',');
            let users = names.map(name =>
                members.find(member =>
                    member.user.username.toLowerCase() === name.toLowerCase()));

            if (!users.includes(null)) {
                changeUserRoles(users, roles, type);
            } else {
                msg.channel.send(`Unable to find matching user.`);
            }
            return;
        }

        let membersToChange = members.array();
        if (options.hasOwnProperty('bots')) {
            membersToChange = membersToChange.filter(member => {
                return member.user.bot;
            });
        } else if (options.hasOwnProperty('users')) {
            membersToChange = membersToChange.filter(member => {
                return !member.user.bot;
            });
        }

        if (options.hasOwnProperty('inrole')) {
            let roleName = options['inrole'];
            membersToChange = membersToChange.filter(member => {
                return member.roles.exists(role => role.name.toLowerCase() ===
                    roleName); //Has specified role.
            });
        } else if (options.hasOwnProperty('notinrole')) {
            let roleName = options['notinrole'];
            membersToChange = membersToChange.filter(member => {
                return !member.roles.exists(role => role.name.toLowerCase() ===
                    roleName); //Doesn't have specified role.
            });
        } else if (options.hasOwnProperty('noroles')) {
            membersToChange = membersToChange.filter(member => {
                return member.roles.size === 1; //Only has @everyone role.
            });
        }

        changeUserRoles(membersToChange, roles, type);
    }

    /*
    Add/remove roles for each user.
    @param {Array|Object} users An array of users, or a single User object.
    @param {String} type The type of role change. 'give' or 'take'.
    */
    function changeUserRoles(users, roles, type) {
        let changeFunction = type === 'give' ? 'addRoles' : 'removeRoles';

        /*
          Filter according to change type.
          Make sure user doesn't have role if adding roles. ('give')
          Make sure user has role if removing roles. ('take')
        */
        if (!Array.isArray(users)) {
            users = [users];
        }

        let promises = [];
        users.forEach(user => {
            promises.push(user[changeFunction](roles.filter(role => {
                return !user.roles.has(role.id) && type === 'give' ||
                    user.roles.has(role.id) && type === 'take';
            })));
        });

        Promise.all(promises).then(() => {
            msg.channel.send(`Modified roles of ${tool.wrap(users.length)} users.`);
        }).catch(() => {
            msg.channel.send(
                'Gomen, I couldn\'nt process all your changes. Please try again.');
        });
    }

    /*
    Changes the name or colour of the specified role.
    */
    function modifyRole(role, options) {
        if (options.hasOwnProperty('name')) {
            role.setName(options['name']);
        }
        if (options.hasOwnProperty('color')) {
            role.setColor(options['color']);
        }
        msg.channel.send(`The role ${tool.wrap(role.name)} has been modified.`);
    }
}

/*
Manages self assignable roles for the server.
*/
function sarInterface(msg) {
    if (!msg.guild.available) return;
    let args = msg.content.split(/\s+/).slice(1);

    if (args[0]) {
        if (args[0] === 'add' && args[1]) {
            addSAR();
        } else if (args[0] === 'remove' && args[1]) {
            removeSAR();
        } else if (args[0] === 'list') {
            listSAR();
        }
    } else {
        return msg.channel.send(`Invalid arguments. Please refer to ${tool.wrap('~help sar')}.`);
    }

    /*
    Add a SAR to the server.
    */
    function addSAR() {
        if (!canManageRoles(msg.member)) {
            return msg.channel.send('You don\'t have permission to manage roles!');
        }

        SAR.findOne({ guildID: msg.guild.id }, (err, guild) => {
            if (guild.sars.includes(args[1])) {
                return msg.channel.send('This SAR already exists.');
            } else {
                add();
            }
        });


        function add() {
            SAR.updateOne({ guildID: msg.guild.id }, { $addToSet: { sars: args[1] } }, { upsert: true },
                (err) => {
                    if (err) {
                        return msg.channel.send('Gomen, I couldn\'t add your SAR.');
                    }
                    msg.guild.createRole({ name: args[1] })
                        .then(role => msg.channel.send(
                            `Created new SAR ${tool.wrap(role.name)}.`))
                        .catch(err => console.log(err));
                });
        }
    }

    /*
    Remove a SAR from the server.
    */
    function removeSAR() {
        if (!canManageRoles(msg.member)) {
            return msg.channel.send('You don\'t have permission to manage roles!');
        }

        SAR.updateOne({ guildID: msg.guild.id }, { $pull: { sars: args[1] } }, { upsert: true },
            (err) => {
                if (err) {
                    return msg.channel.send('Gomen, I couldn\'t remove your SAR.');
                }

                let roleToDelete = msg.guild.roles.find(role => role.name === args[1]);
                if (roleToDelete) {
                    roleToDelete.delete('Remove SAR.')
                        .then(role => msg.channel.send(
                            `Deleted SAR ${tool.wrap(role.name)}.`))
                        .catch(() => msg.channel.send('Gomen, I couldn\'t remove your SAR.'));
                } else {
                    msg.channel.send(`That SAR doesn't exist, ${tool.tsunNoun()}!`);
                }
            });
    }

    function listSAR() {
        SAR.findOne().lean().exec((err, guild) => {
            let reducer = (acc, curVal) => acc + ', ' + curVal;
            let list = guild.sars.reduce(reducer);
            msg.channel.send(tool.wrap(list));
        });
    }

    function canManageRoles(member) {
        return member.hasPermission('MANAGE_ROLES');
    }
}

function roleMe(msg) {
    let args = msg.content.split(/\s+/).slice(1);

    if (!args[0]) {
        return msg.channel.send(`Give me a SAR, ${tool.tsunNoun()}!`);
    }

    SAR.findOne({ guildID: msg.guild.id }, (err, guild) => {
        console.log('hi');
        if (guild.sars.includes(args[0])) {
            let roleToToggle = msg.guild.roles.find(role => role.name === args[0]);

            if (roleToToggle) {
                if (msg.member.roles.exists('name', args[0])) {
                    msg.member.removeRole(roleToToggle, 'SAR')
                        .then(() =>
                            msg.channel.send(
                                `Removed ${tool.wrap(args[0])} from ${msg.author.username}.`
                            ))
                        .catch(() => msg.channel.send(
                            'Gomen I couldn\'t toggle your SAR.'));
                } else {
                    msg.member.addRole(roleToToggle, 'SAR')
                        .then(() =>
                            msg.channel.send(
                                `Assigned ${tool.wrap(args[0])} to ${msg.author.username}.`
                            ))
                        .catch(() => msg.channel.send(
                            'Gomen I couldn\'t toggle your SAR.'));
                }
            } else {
                msg.channel.send(`The role has been removed manually, please add it back.`);
            }
        } else {
            msg.channel.send(`That SAR doesn't exist, ${tool.tsunNoun()}!`);
        }
    });
}

/*
Rolls a number between 1 and num1 or num1 and num2 inclusive.
*/
function roll(msg) {
    let args = msg.content.split(/\s+/).slice(1);
    if (args.length > 2)
        return;

    if (args.length === 1) {
        let num = parseInt(args[0]);
        if (tool.isInt(num))
            msg.channel.send(tool.randInt(num) + 1);
        else
            msg.channel.send(`These aren't numbers ${tool.tsunNoun()}!`);
    } else {
        let num1 = parseInt(args[0]);
        let num2 = parseInt(args[1]);
        if (!tool.isInt(num1) || !tool.isInt(num2))
            return
        msg.channel.send(`These aren't numbers ${tool.tsunNoun()}!`);

        if (num1 > num2)
            msg.channel.send(tool.randInt(num1 - num2 + 1) + num2);
        else
            msg.channel.send(tool.randInt(num2 - num1 + 1) + num1);
    }
}

/*
 * Translates from English to Japanese using Google Translate.
 */
function weebify(msg) {
    let sourceText = msg.content.substring(msg.content.indexOf(' ') + 1);
    if (!sourceText) return msg.channel.send(
        `Give me something to weebify, ${tool.tsunNoun()}!`);

    let url =
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURI(sourceText)}`;
    rp({ url: url }).then(body => {
        let result = JSON.parse(body);
        msg.channel.send(result[0][0][0] + '\n' + kuroshiro.toRomaji(
            result[0][0][0], { mode: 'spaced' }));
    }).catch(err => console.log(err.message));
}
