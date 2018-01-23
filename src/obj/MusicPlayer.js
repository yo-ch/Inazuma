'use strict';
const tool = require('../tool.js');
const RichEmbed = require('discord.js').RichEmbed;

const Status = {
    OFFLINE: 0,
    STOPPED: 1,
    PAUSED: 2,
    PLAYING: 3
};

/*
The music player for a guild.
Handles the queuing, and streaming of Songs.
*/
class MusicPlayer {
    constructor() {
        this.queue = [];
        this.musicChannel = null;
        this.voiceConnection = null;
        this.dispatch = null;
        this.volume = 0.5;
        this.status = Status.OFFLINE; //States: offline, playing, stopped, paused
        this.inactivityTimer = 300;
    }

    /*
    Adds the song to the queue.
    If an index argument is included, insert the song at that index instead of pushing it to the queue.

    @param {Object} song The song to queue.
    @param {Number} [index] The index to insert the song at.
    */
    queueSong(song, index = null) {
        if (index != null) {
            this.queue[index] = song;
        } else {
            this.queue.push(song);
        }
    }

    /*
    A recursive function that plays the queue.
    */
    async playSong(msg) {
        if (this.queue.length === 0) {
            this.musicChannel.send('Queue complete.');
            this.changeStatus(Status.STOPPED);
        } else if (this.voiceConnection) {
            let song = this.queue[0];

            let badStream = false;
            let stream = await song.getStream().catch(() => { badStream = true });

            if (badStream) {
                console.log(`Failed to get stream. ${song.title}`);
                this.dispatch = null;
                this.queue.shift();
                return this.playSong(msg);
            }

            this.dispatch = this.voiceConnection.playStream(stream, {
                passes: 2,
                volume: this.volume
            }).catch(error => {
                console.log(error);
                this.dispatch = null;
                this.queue.shift();
                setTimeout(() => { this.playSong(msg) }, 100);
            });

            this.dispatch.once('start', () => {
                this.musicChannel.send(
                    new RichEmbed()
                    .setTitle(`:notes: ${tool.wrap(song.title)}`)
                    .setURL(song.url)
                    .setThumbnail(song.thumbnail)
                );
                this.changeStatus(Status.PLAYING);
                song.startTime = tool.getUnixTime();
            });

            this.dispatch.on('error', error => {
                console.log(error);
                this.dispatch = null;
                this.queue.shift();
                setTimeout(() => { this.playSong(msg) }, 100);
            });

            this.dispatch.once('end', reason => {
                this.dispatch = null;
                this.queue.shift();
                if (reason != 'leave') {
                    setTimeout(() => this.playSong(msg), 100);
                }
            });

            this.dispatch.on('debug', info => {
                console.log(info);
            });
        } else {
            msg.channel.send(
                `Please summon me using ${tool.wrap('~music join')} to start playing the queue.`
            );
        }
    }


    /*
    Skips the current song.
    */
    skipSong() {
        if (this.dispatch && this.status === Status.PLAYING) {
            this.musicChannel.send(
                new RichEmbed({ description: `:fast_forward: ${tool.wrap(this.queue[0].title)}` })
            );
            this.dispatch.end();
        } else {
            this.musicChannel.send(`There 's nothing to skip! ${tool.inaBaka}`);
        }
    }

    /*
    Pauses the dispatcher.
    */
    pauseSong() {
        if (this.dispatch)
            this.dispatch.pause();
        else
            this.musicChannel.send(
                `Nothing is playing right now. ${tool.inaBaka}`
            );
    }

    /*
    Resumes the dispatcher.
    */
    resumeSong() {
        if (this.dispatch)
            this.dispatch.resume();
        else
            this.musicChannel.send(
                `Nothing is playing right now. ${tool.inaBaka}`
            );

    }

    /*
    Prints the queue.
    */
    printQueue(msg) {
        if (this.queue.length > 0) {
            try {
                let queueString = '';
                for (let i = 0; i < this.queue.length && i < 15; i++)
                    queueString += `${i + 1}. ${this.queue[i].title}\n`;
                if (this.queue.length > 15)
                    queueString += `\nand ${this.queue.length - 15} more.`;
                msg.channel.send(queueString, { 'code': true });
            } catch (err) {
                console.log('ERROR CAUGHT:\n' + err);
                msg.channel.send(
                    `${tool.inaError} Gomen, I can't display the queue right now. Try again in a few moments onegai.`
                );
            }
        } else {
            msg.channel.send(`There are no songs in the queue!`);
        }
    }

    /*
    Clears the queue.
    */
    purgeQueue(msg) {
        if (this.status === Status.PLAYING || this.status === Status.PAUSED) {
            this.queue = [this.queue[0]];
        } else {
            this.queue = [];
        }
        msg.channel.send('The queue has been cleared.');
    }

    /*
    Shuffles the queue.
    */
    shuffleQueue(msg) {
        if (this.status === Status.PLAYING || this.status === Status.PAUSED) {
            this.queue = [this.queue[0]].concat(tool.shuffle(
                this.queue.slice(1)));
        } else {
            this.queue = tool.shuffle(this.queue);
        }
        msg.channel.send(new RichEmbed({ description: ':twisted_rightwards_arrows: Queue shuffled!' }));
    }

    /*
    Displays the currently playing song and elapsed time.
    */
    nowPlaying(msg) {
        if (this.queue.length > 0) {
            let elapsedTime = tool.formatTime(tool.getUnixTime() -
                this.queue[0].startTime);
            msg.channel.send(
                new RichEmbed()
                .setTitle(`:notes: ${tool.wrap(this.queue[0].title)}`)
                .setDescription(tool.wrap(
                    `|${elapsedTime}/${this.queue[0].duration}|`))
            );
        } else {
            msg.channel.send(
                'Nothing is playing right now.');
        }
    }

    /*
    Sets the volume of the dispatcher.
    */
    setVolume(msg) {
        let vol = parseInt(msg.content.split(/\s+/)[2]) /
            100;
        if (vol && (vol >= 0 && vol <= 1)) {
            if (this.dispatch) {
                this.dispatch.setVolume(vol);
                this.volume = vol;
                msg.channel.send(
                    new RichEmbed({ description: `:speaker: ${tool.wrap(vol * 100)}` }));
            } else {
                msg.channel.send(`Nothing is playing right now. ${tool.inaAngry}`);
            }
        } else {
            msg.channel.send(`Use a number between 0 and 100! ${tool.inaBaka}`);
        }
    }

    /*
    Summons the bot to the user's voice channel.
    */
    joinVc(msg) {
        if (msg.member.voiceChannel) {
            if (this.voiceConnection === null) {
                this.musicChannel = msg.channel;
                this.musicChannel.send(
                    new RichEmbed({ description: `Joined and bound to :speaker:**${msg.member.voiceChannel.name}** and #**${this.musicChannel.name}**.` })
                );
                msg.member.voiceChannel.join().then(
                    connection => {
                        this.voiceConnection = connection;
                        this.changeStatus(Status.STOPPED);
                        if (this.queue.length > 0) {
                            this.playSong(msg);
                        }
                    });
            }
        } else {
            msg.channel.send(
                `You're not in a voice channel! ${tool.inaBaka}`
            );
        }
    }

    /*
    Disconnects from the voice channel.
    */
    leaveVc(msg) {
        if (this.voiceConnection) {
            this.musicChannel.send(
                new RichEmbed({ description: `:no_entry: Leaving **${this.voiceConnection.channel.name}**.` })
            );
            this.musicChannel = null;
            if (this.dispatch) this.dispatch.end('leave');
            this.voiceConnection.disconnect();

            this.changeStatus(Status.OFFLINE);

            this.voiceConnection = null;
            this.dispatch = null;
        } else {
            msg.channel.send(
                `I'm not in a voice channel! ${tool.inaBaka}`
            );
        }
    }

    /*
    Changes the status of the bot.
    @param {String} status The status to set the bot to.
    */
    changeStatus(status) {
        this.status = status;
        this.inactivityTimer = status === Status.PAUSED ?
            600 :
            300;
    }
}

module.exports = MusicPlayer;
