const util = require('../../util/util.js');
const RichEmbed = require('discord.js').RichEmbed;

const Status = {
    OFFLINE: 0,
    STOPPED: 1,
    PAUSED: 2,
    PLAYING: 3
};

/**
 * The music player for a guild.
 * Handles the queuing, and streaming of Songs.
 */
class MusicPlayer {
    constructor(guildId) {
        this.guildId = guildId;
        this.queue = [];
        this.musicChannel = null;
        this.voiceConnection = null;
        this.dispatch = null;
        this.volume = 0.2;
        this.status = Status.OFFLINE;

        this.leaveTimeout = null;
        this.inactiveTimer = 300000;
    }

    getTextChannel(msg) {
        return this.musicChannel || msg.channel;
    }

    /**
     * Adds the song to the end of the queue.
     * 
     * @param {Song} song The song to queue.
     */
    queueSong(song) {
        this.queue.push(song);
    }

    /**
     * Adds songs to the end of the queue.
     * 
     * @param {Array<Song>} songs 
     */
    queueSongs(songs) {
        this.queue = this.queue.concat(songs);
    }

    /**
     * Adds the song to the start of the queue.
     * 
     * @param {Song} song The song to queue.
     */
    queueStart(song) {
        this.queue.unshift(song);
    }

    /**
     * Recursive function to start playing the queue.
     */
    async play() {
        if (this.queue.length === 0) {
            this.musicChannel.send(new RichEmbed({ description: ':stop_button: Queue complete.' }));
            this.changeStatus(Status.STOPPED);
        } else if (this.voiceConnection) {
            const song = this.queue[0];

            try {
                const stream = await song.processor.getStream(song);
                this.dispatch = this.voiceConnection.playStream(stream, {
                    passes: 2,
                });
                this.dispatch.setVolumeLogarithmic(this.volume);
            } catch (error) {
                console.log(error);
                this.dispatch = null;
                this.queue.shift();
                return this.play();
            }

            this.dispatch.once('start', () => {
                this.musicChannel.send(
                    new RichEmbed()
                        .setTitle(`:notes: ${util.wrap(song.title)}`)
                        .setURL(song.url)
                        .setThumbnail(song.thumbnail)
                );
                this.changeStatus(Status.PLAYING);
                song.startTime = util.getUnixTime();
            });

            this.dispatch.on('error', (error) => {
                console.log(error);
                this.dispatch = null;
                this.queue.shift();
                setTimeout(() => this.play(), 100);
            });

            this.dispatch.once('end', (reason) => {
                this.dispatch = null;
                this.queue.shift();
                if (reason !== 'leave') {
                    setTimeout(() => this.play(), 100);
                }
            });

            this.dispatch.on('debug', (info) => {
                console.log(info);
            });
        }
    }


    /**
     * Skips the current song.
     */
    skip() {
        if (this.isPlaying()) {
            this.musicChannel.send(
                new RichEmbed({ description: `:fast_forward: ${util.wrap(this.queue[0].title)}` })
            );
            this.dispatch.end();
        }
    }

    /**
     * Pauses the current song.
     */
    pause() {
        if (this.isPlaying()) {
            this.dispatch.pause();
        }
    }

    /**
     * Resumes the current song.
     */
    resume() {
        if (this.isPlaying()) {
            this.dispatch.resume();
        }
    }

    /**
     * Returns the queue.
     */
    getQueue() {
        return this.queue.slice();
    }

    /**
     * Clears the queue.
     */
    purgeQueue(msg) {
        if (this.isPlaying()) {
            this.queue = [this.queue[0]];
        } else {
            this.queue = [];
        }
        this.getTextChannel(msg).send(
            new RichEmbed({ description: 'The queue has been cleared.' })
        );
    }

    /**
     * Shuffles the queue.
     */
    shuffleQueue(msg) {
        if (this.isPlaying()) {
            this.queue = [this.queue[0]].concat(util.shuffle(this.queue.slice(1)));
        } else {
            this.queue = util.shuffle(this.queue);
        }
        this.getTextChannel(msg).send(
            new RichEmbed({ description: ':twisted_rightwards_arrows: Queue shuffled!' })
        );
    }

    /**
     * Displays the currently playing song and elapsed time.
     */
    nowPlaying() {
        if (this.isPlaying()) {
            let elapsedTime = util.formatTime(util.getUnixTime() -
                this.queue[0].startTime);
            this.musicChannel.send(
                new RichEmbed({
                    title: `:notes: ${util.wrap(this.queue[0].title)}`,
                    description: util.wrap(`|${elapsedTime}/${this.queue[0].duration}|`, '**')
                })
            );
        }
    }

    /**
     * Sets the volume of the music player.
     * @param {Number} vol A value between 0 and 100 to set the volume to.
     */
    setVolume(vol) {
        if (this.isPlaying()) {
            vol /= 100;
            this.dispatch.setVolumeLogarithmic(vol);
            this.volume = vol;
            this.musicChannel.send(new RichEmbed({ description: `:speaker: ${util.wrap(vol * 100)}` }));
        }
    }

    /**
     * Summons the bot to the user's voice channel.
     */
    async join(msg) {
        if (msg.member.voiceChannel) {
            if (this.voiceConnection === null) {
                this.musicChannel = msg.channel;
                this.musicChannel.send(
                    new RichEmbed({ description: `Joined and bound to :speaker:${util.wrap(msg.member.voiceChannel.name, '**')} and #${util.wrap(this.musicChannel.name, '**')}.` })
                );
                this.voiceConnection = await msg.member.voiceChannel.join();
                this.changeStatus(Status.STOPPED);

                if (this.queue.length > 0) {
                    this.play(msg);
                }
            }
        } else {
            msg.channel.send(`You're not in a voice channel!`);
        }
    }

    /**
     * Disconnects from the voice channel.
     */
    leave(msg) {
        if (this.voiceConnection) {
            this.musicChannel.send(
                new RichEmbed({ description: `:no_entry: Leaving ${util.wrap(this.voiceConnection.channel.name, '**')}.` })
            );
            if (this.dispatch) {
                this.dispatch.end('leave');
            }
            this.voiceConnection.disconnect();

            this.changeStatus(Status.OFFLINE);

            this.musicChannel = null;
            this.voiceConnection = null;
            this.dispatch = null;
        } else {
            msg.channel.send(`I'm not in a voice channel!`);
        }
    }

    /**
     * Changes the status of the bot.
     * @param {String} status The status to set the bot to.
     */
    changeStatus(status) {
        this.status = status;

        if (status === Status.STOPPED) {
            this.leaveTimeout = setTimeout(() => this.leave(), this.inactiveTimer);
        } else if (status === Status.PLAYING) {
            clearTimeout(this.leaveTimeout);
        }
    }

    inVoice() {
        return this.status === Status.STOPPED;
    }

    isPlaying() {
        return this.status === Status.PLAYING || this.status === Status.PAUSED;
    }
}

module.exports = MusicPlayer;
