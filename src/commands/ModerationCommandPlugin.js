class BanCommand extends AbstractCommand {
    get name() {
        return 'ban';
    }

    get description() {
        return '';
    }

    handleMessage({ msg, options }) {
        if (!msg.member.hasPermission('BAN_MEMBERS')) {
            return msg.channel.send(`You don't have permission to ban members!`);
        }
        const memberToBan = msg.mentions.members.first();
        if (memberToBan && memberToBan.bannable && (msg.member.highestRole.calculatedPosition >
            memberToBan.highestRole.calculatedPosition || msg.guild.ownerID === msg.author.id)) {
            const reason = options.reason;
            const days = parseInt(options.days);

            const banOptions = {
                days: days ? days : 0,
                reason: reason ? reason : 'none'
            };
            memberToBan.ban(banOptions);
        }
    }
}

class PruneCommand extends AbstractCommand {
    get name() {
        return 'prune';
    }

    get description() {
        return '';
    }

    handleMessage({ msg, args, options }) {
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
                            .indexOf(stringToFilter) > -1 : true;
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
}

class SelfAssignableRoleCommand extends AbstractCommand {
    get name() {
        return 'sar';
    }

    get description() {
        return '';
    }

    handleMessage() {
        if (!msg.guild.available) return;
        let args = msg.content.split(/\s+/).slice(1);

        if (args[0]) {
            if (args[0] === 'add' && args[1]) {
                this.addSar();
            } else if (args[0] === 'remove' && args[1]) {
                this.removeSar();
            } else if (args[0] === 'list') {
                this.listSar();
            }
        } else {
            return msg.channel.send(
                `Invalid arguments. Please refer to ${tool.wrap('~help sar')}.`);
        }
    }

    addSar() {
        if (!this.canManageRoles(msg.member)) {
            return msg.channel.send('You don\'t have permission to manage roles!');
        }

        Guilds.findOne({ guildID: msg.guild.id }, (err, guild) => {
            if (guild && guild.sars.includes(args[1])) {
                return msg.channel.send('This SAR already exists.');
            } else {
                add();
            }
        });


        function add() {
            Guilds.updateOne({ guildID: msg.guild.id }, { $addToSet: { sars: args[1] } }, { upsert: true },
                (err) => {
                    if (err) {
                        console.log(err);
                        return msg.channel.send('Gomen, I couldn\'t add your SAR.');
                    }
                    if (!msg.guild.roles.exists('name', args[1])) {
                        msg.guild.createRole({ name: args[1] })
                            .then(() => msg.channel.send(
                                `Created new SAR ${args[1]}.`))
                            .catch(err => console.log(err));
                    } else {
                        msg.channel.send(
                            `Created new SAR ${tool.wrap(args[1])}.`)
                    }
                });
        }
    }

    removeSar() {
        if (!this.canManageRoles(msg.member)) {
            return msg.channel.send('You don\'t have permission to manage roles!');
        }

        Guilds.updateOne({ guildID: msg.guild.id }, { $pull: { sars: args[1] } }, { upsert: true },
            (err) => {
                if (err) {
                    return msg.channel.send('Gomen, I couldn\'t remove your SAR.');
                }

                let roleToDelete = msg.guild.roles.find(role => role.name === args[1]);
                if (roleToDelete) {
                    roleToDelete.delete('Remove SAR.')
                        .then(() => msg.channel.send(
                            `Deleted SAR ${tool.wrap(args[1])}.`))
                        .catch(() => msg.channel.send(
                            'Gomen, I couldn\'t remove your SAR.'));
                } else {
                    msg.channel.send(`That SAR doesn't exist, ${tool.tsunNoun()}!`);
                }
            });
    }

    listSar() {
        Guilds.findOne({ guildID: msg.guild.id }).lean().exec((err, guild) => {
            if (err) {
                return;
            }

            if (guild) {
                let reducer = (acc, curVal) => acc + ', ' + curVal;
                let list = guild.sars.reduce(reducer);
                msg.channel.send(tool.wrap(list));
            } else {
                msg.channel.send('This server has no SARs.');
            }
        });
    }

    canManageRoles(member) {
        return member.hasPermission('MANAGE_ROLES');
    }
}

class KickCommand extends AbstractCommand {
    get name() {
        return 'kick';
    }

    get description() {
        return '';
    }

    handleMessage({ msg, options }) {
        if (!msg.member.hasPermission('KICK_MEMBERS')) {
            return msg.channel.send(`You don't have permission to kick members!`);
        }
        const memberToKick = msg.mentions.members.first();
        if (memberToKick && memberToKick.kickable && (msg.member.highestRole.calculatedPosition >
            memberToKick.highestRole.calculatedPosition || msg.guild.ownerID === msg.author.id)) {
            const reason = options.reason;
            memberToKick.kick(reason ? reason : 'none');
        }
    }
}
