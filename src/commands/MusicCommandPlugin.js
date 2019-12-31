const AbstractCommandPlugin = require('../lib/base/AbstractCommandPlugin.js');
const AbstractCommand = require('../lib/base/AbstractCommand.js');

const util = require('../util/util.js');

const MusicPlayer = require('../lib/music/MusicPlayer.js');
const YoutubeProcessor = require('../lib/music/processor/YoutubeProcessor.js');
const YoutubeSearchProcessor = require('../lib/music/processor/YoutubeSearchProcessor.js');
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
        this.processors = [
            YoutubeProcessor,
            YoutubeSearchProcessor
        ];
    }

    get name() {
        return 'music';
    }

    handleMessage(params) {
        super.handleMessage({
            ...params,
            plugin: {
                processors: this.processors,
                getPlayer: (init) => this.getGuildPlayer(params.msg.guild.id, init),
                destroyPlayer: () => this.destroyGuildPlayer(params.msg.guild.id)
            }
        });
    }

    getGuildPlayer(guildId, init = true) {
        delete this.timeouts[guildId];
        return this.guildPlayers[guildId] || init && this.initGuildPlayer(guildId);
    }

    initGuildPlayer(guildId) {
        this.guildPlayers[guildId] = new MusicPlayer(guildId);
        return this.guildPlayers[guildId];
    }

    destroyGuildPlayer(guildId) {
        this.timeouts[guildId] = setTimeout(() => delete this.guildPlayers[guildId], 300000);
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
        function autoplay(player) {
            if (!player.inVoice()) {
                msg.channel.send(`Summon me with ${util.commandString('join')} to start playing the queue.`);
            } else if (!player.isPlaying()) {
                player.play();
            }
        }

        if (!playRequest) {
            return;
        }

        try {
            let processed = false;
            for (const processor of plugin.processors) {
                if (processor.isValidRequest(playRequest)) {
                    const player = plugin.getPlayer();

                    if (processor.isValidSong(playRequest)) {
                        const song = await processor.processSong(playRequest);
                        player.queueSong(song);
                        autoplay(player);
                        msg.channel.send(new RichEmbed({
                            description: `Enqueued ${util.wrap(song.title.trim())} to position **${player.getQueue().length}**`
                        }));
                    } else if (processor.isValidPlaylist(playRequest)) {
                        const { playlistName, songs } = await processor.processPlaylist(playRequest);
                        player.queueSongs(songs);
                        autoplay(player);
                        msg.channel.send(new RichEmbed({
                            description: `Enqueued ${util.wrap(songs.length)} songs from ${util.wrap(playlistName)}`
                        }));
                    }

                    processed = true;
                    break;
                }
            }

            if (!processed) {
                msg.channel.send('Invalid music request.');
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
        const player = plugin.getPlayer(false);
        if (player) {
            player.leave(msg);
            plugin.destroyPlayer();
        }
    }
}

module.exports = MusicCommandPlugin;
