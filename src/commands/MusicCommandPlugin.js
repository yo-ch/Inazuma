const AbstractCommandPlugin = require('../lib/base/AbstractCommandPlugin.js');
const AbstractCommand = require('../lib/base/AbstractCommand.js');

const util = require('../util/util.js');


const Song = require('../lib/music/Song.js');
const MusicPlayer = require('../lib/music/MusicPlayer.js');
const YoutubeProcessor = require('../lib/music/processor/YoutubeProcessor.js');
const RichEmbed = require('discord.js').RichEmbed;

class MusicCommandPlugin extends AbstractCommandPlugin {
    constructor() {
        super(
            PlayCommand,
            SkipCommand,
            PauseCommand,
            ResumeCommand,
            VolumeCommand,
            NowPlayingCommand,
            PrintQueueCommand,
            PurgeCommand,
            ShuffleCommand,
            JoinCommand,
            LeaveCommand
        );

        this.guildPlayers = {};
        this.timeouts = {};
        this.processors = [YoutubeProcessor];
    }

    get name() {
        return 'music';
    }

    get description() {
        return 'Music commands.';
    }

    handleMessage(params) {
        super.handleMessage({
            ...params,
            plugin: {
                processors: this.processors,
                getPlayer: () => this.getGuildPlayer(params.msg.guild.id),
                destroyPlayer: () => this.destroyGuildPlayer(params.msg.guild.id)
            }
        });
    }

    getGuildPlayer(guildId) {
        delete this.timeouts[guildId];
        return this.guildPlayers[guildId] || this.initGuildPlayer(guildId);
    }

    initGuildPlayer(guildId) {
        this.guildPlayers[guildId] = new MusicPlayer(guildId);
        return this.guildPlayers[guildId];
    }

    destroyGuildPlayer(guildId) {
        this.timeouts[guildId] = this.setTimeout(() => delete this.guildPlayers[guildId], 300000);
    }
}

class PlayCommand extends AbstractCommand {
    get name() {
        return 'play';
    }

    get description() {
        return '';
    }

    async handleMessage({ msg, commandStr: playRequest, plugin }) {
        if (!playRequest) {
            return;
        }

        try {
            for (const processor of plugin.processors) {
                if (processor.isValidRequest(playRequest)) {
                    const player = plugin.getPlayer();

                    if (processor.isValidSong(playRequest)) {
                        player.queueSong(await processor.processSong(playRequest));
                    } else if (processor.isValidPlaylist(playRequest)) {
                        const { playlistName, songs } = await processor.processPlaylist(playRequest);
                        songs.forEach((song) => player.queueSong(song));
                    }

                    if (!player.inVoice()) {
                        msg.channel.send(`${util.commandString('join')} to start playing the queue.`);
                    }
                }
            }
        } catch (err) {
            console.log(err);
        }
    }
}

class SkipCommand extends AbstractCommand {
    get name() {
        return 'skip';
    }

    get description() {
        return '';
    }

    handleMessage({ msg, plugin }) {
        const player = plugin.getPlayer();
        if (player.isPlaying()) {
            player.skip();
        } else {
            msg.channel.send('Nothing is playing right now.');
        }
    }
}

class PauseCommand extends AbstractCommand {
    get name() {
        return 'pause';
    }

    get description() {
        return '';
    }

    handleMessage({ msg, plugin }) {
        const player = plugin.getPlayer();
        if (player.isPlaying()) {
            player.pause();
        } else {
            msg.channel.send('Nothing is playing right now.');
        }
    }
}

class ResumeCommand extends AbstractCommand {
    get name() {
        return 'resume';
    }

    get aliases() {
        return ['pause'];
    }

    get description() {
        return '';
    }

    handleMessage({ msg, plugin }) {
        const player = plugin.getPlayer();
        if (player.isPlaying()) {
            player.resume();
        } else {
            msg.channel.send('Nothing is playing right now.');
        }
    }
}

class VolumeCommand extends AbstractCommand {
    get name() {
        return 'volume';
    }

    get aliases() {
        return ['vol'];
    }

    get description() {
        return '';
    }

    handleMessage({ msg, plugin, commandStr }) {
        const player = plugin.getPlayer();
        if (player.isPlaying()) {
            const vol = parseInt(commandStr);
            if (!vol && !(0 <= vol && vol <= 100)) {
                return msg.channel.send('Please pass a number between 0 and 100.');
            }
            player.setVolume(vol);
        } else {
            msg.channel.send('Nothing is playing right now.');
        }
    }
}

class NowPlayingCommand extends AbstractCommand {
    get name() {
        return 'np';
    }

    get aliases() {
        return ['nowplaying'];
    }

    get description() {
        return '';
    }

    handleMessage({ msg, plugin }) {
        const player = plugin.getPlayer();
        if (player.isPlaying()) {
            plugin.getPlayer().nowPlaying();
        } else {
            msg.channel.send('Nothing is playing right now.');
        }
    }
}


class PrintQueueCommand extends AbstractCommand {
    get name() {
        return 'queue';
    }

    get description() {
        return '';
    }

    handleMessage({ msg, plugin }) {
        const queue = plugin.getPlayer().getQueue();

        if (queue.length > 0) {
            let queueString = '';
            for (let i = 0; i < queue.length && i < 15; i++) {
                queueString += `${i + 1}. ${queue[i].title}\n`;
            }
            if (queue.length > 15) {
                queueString += `\nand ${queue.length - 15} more.`;
            }
            msg.channel.send(queueString, { 'code': true });
        } else {
            msg.channel.send(`There are no songs in the queue!`);
        }
    }
}

class PurgeCommand extends AbstractCommand {
    get name() {
        return 'purge';
    }

    get aliases() {
        return ['clear'];
    }

    get description() {
        return '';
    }

    handleMessage({ msg, plugin }) {
        plugin.getPlayer().purgeQueue(msg);
    }
}

class ShuffleCommand extends AbstractCommand {
    get name() {
        return 'shuffle';
    }

    get description() {
        return '';
    }

    handleMessage({ msg, plugin }) {
        plugin.getPlayer().shuffleQueue(msg);
    }
}

class JoinCommand extends AbstractCommand {
    get name() {
        return 'join';
    }

    get description() {
        return '';
    }

    handleMessage({ msg, plugin }) {
        plugin.getPlayer().join(msg);
    }
}

class LeaveCommand extends AbstractCommand {
    get name() {
        return 'leave';
    }

    get description() {
        return '';
    }

    handleMessage({ msg, plugin }) {
        plugin.getPlayer().leave(msg);
        plugin.destroyPlayer();
    }
}

module.exports = MusicCommandPlugin;