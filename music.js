const ytdl = require('youtube-dl');
const request = require('request');
const config = require('./config.json');
const tool = require('./tool.js');
const ani = require('./anime.js');

var guilds = {};

module.exports = function(client) {
    client.on('message', msg => { //Respond to music requests.
        if (msg.author.bot) return;
        if (!msg.guild || !msg.guild.available) return;

        var args = msg.content.split(/\s+/);
        if (args[0] !== command('music') && args[0] !== command('m')) return;

        //Add guild to the guild list.
        if (!guilds[msg.guild.id]) guilds[msg.guild.id] = {
            "queue": [],
            "musicChannel": msg.guild.channels.find('name', 'music'),
            "voiceConnection": null,
            "dispatch": null,
            "status": 'offline', //States: offline, playing, stopped
            "inactivityTimer": 300
        };

        var guild = guilds[msg.guild.id];

        if (!guild.musicChannel) {
            guild.musicChannel = msg.guild.channels.find('name', 'music');
            if (!guild.musicChannel) {
                msg.channel.send(
                    `Please create a ${tool.wrap('#music')} channel!`);
                return;
            }
        }

        switch (args[1]) {
            case 'play':
            case 'p':
                return queueSong(msg, guild);
            case 'skip':
            case 's':
                return skipSong(guild);
            case 'pause':
                return pauseSong(guild);
            case 'resume':
                return resumeSong(guild);
            case 'queue':
            case 'q':
                return printQueue(guild);
            case 'np':
                return nowPlaying(msg, guild);
            case 'summon':
                return summonBot(msg, guild);
            case 'vol':
            case 'v':
                return setVolume(msg, guild);

            case 'hime':
                return hime(msg, guild);
            default:
                msg.channel.send(
                    `Please refer to ${tool.wrap('~help music')}.`
                );
        }
    });
}

/*
Queues the song at the given URL.
*/
function queueSong(msg, guild) {
    var url = msg.content.split(/\s+/)[2];

    if (url)
        ytdl.getInfo(url, (err, info) => {
            if (err || info.format_id === undefined)
                return guild.musicChannel.send(`Invalid video, ${ani.tsunNoun()}!`);

            guild.musicChannel.send(
                `Enqueued ${tool.wrap(info.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
            ).then(() => {
                msg.delete();
                guild.queue.push(info);
                if (guild.queue.length === 1) playSong(msg, guild);
            }).catch(() => {});
        });
}

/*
Plays the first song in the queue.
*/
function playSong(msg, guild) {
    if (guild.queue.length === 0) {
        guild.musicChannel.send('Queue complete.');
        changeStatus(guild, 'stopped');
    } else {
        //Find the voice channel to play in.
        new Promise((resolve, reject) => {
            if (guild.voiceConnection)
                resolve();
            else if ((!guild.voiceConnection || guild.voiceConnection.members.size ===
                    1) && msg.member.voiceChannel) {
                msg.member.voiceChannel.join().then(connection => {
                    guild.voiceConnection = connection;
                    guild.musicChannel.send(
                        `Joining **${msg.member.voiceChannel.name}**.`
                    );
                    resolve();
                }).catch(() => {});
            } else {
                reject();
            }

        }).then(() => {
            //Play song.
            changeStatus(guild, 'playing');

            const music = guild.queue[0];
            guild.musicChannel.send(
                `:notes: Now playing ${tool.wrap(music.title.trim())}`).then(
                () => {
                    guild.dispatch = guild.voiceConnection.playArbitraryInput(
                        request(music.url));

                    //Wait for errors/end of song, then play the next song.
                    guild.dispatch.on('error', error => {
                        guild.queue.shift();
                        playSong(msg, guild);
                    });

                    guild.dispatch.on('end', reason => {
                        guild.queue.shift();
                        playSong(msg, guild);
                    });
                }).catch(() => {});
        }).catch(() => {
            msg.channel.send(`You aren\'t in a voice channel! ${tool.inaBaka}`)
        });
    }
}

/*
Skips the current song.
*/
function skipSong(guild) {
    if (guild.dispatch)
        guild.dispatch.end();
    else
        guild.musicChannel.send(`There\'s nothing to skip! ${tool.inaBaka}`);
}

/*
Pauses the stream.
*/
function pauseSong(guild) {
    if (guild.dispatch) {
        guild.dispatch.pause();
        changeStatus(guild, 'stopped')
    } else {
        guild.musicChannel.send(`Nothing is playing right now. ${tool.inaBaka}`);
    }
}

/*
Resumes the stream.
*/
function resumeSong(guild) {
    if (guild.dispatch) {
        guild.dispatch.resume();
        changeStatus(guild, 'playing');
    } else {
        guild.musicChannel.send(`Nothing is playing right now. ${tool.inaBaka}`);
    }
}

/*
Prints the queue.
*/
function printQueue(guild) {
    if (guild.queue.length > 0) {
        var queueString = '';
        for (var i = 0; i < guild.queue.length; i++)
            queueString += `${i+1}. ${guild.queue[i].title}\n`;
        guild.musicChannel.send(queueString, { 'code': true });
    } else {
        guild.musicChannel.send(`There are no songs in the queue!`);
    }
}

/*
Displays the currently playing song.
*/
function nowPlaying(msg, guild) {
    msg.delete();
    if (guild.queue.length > 0)
        guild.musicChannel.send(`Now playing ${tool.wrap(guild.queue[0].title)}.`);
    else
        guild.musicChannel.send('Nothing is playing right now.');
}

/*
Sets the volume of the stream.
*/
function setVolume(msg, guild) {
    var vol = parseInt(msg.content.split(/\s+/)[2]) / 100;
    if (vol && (vol >= 0 && vol <= 1)) {
        if (guild.dispatch) {
            guild.dispatch.setVolumeLogarithmic(vol);
            guild.musicChannel.send(`Volume set to ${tool.wrap(vol*100)}`);
        } else {
            guild.musicChannel.send(`Nothing is playing right now. ${tool.inaAngry}`);
        }
    } else {
        guild.musicChannel.send(`Use a number between 0 and 100! ${tool.inaBaka}`);
    }
}

/*
Summons the bot to the user's voice channel.
*/
function summonBot(msg, guild) {
    if (msg.member.voiceChannel) {
        msg.member.voiceChannel.join().then(connection => {
            guild.voiceConnection = connection;
            guild.musicChannel.send(
                `Joining **${msg.member.voiceChannel.name}**.`
            );
            if (guild.queue.length > 0) playSong(msg, guild);
        })
    } else {
        msg.channel.send(`You\'re not in a voice channel! ${tool.inaBaka}`);
    }
}

/*
Hime hime.
*/
function hime(msg, guild) {
    msg.content = '~m p https://soundcloud.com/shiinub/namirin-koi-no-hime-hime-pettanko';
    queueSong(msg, guild);
}

function changeStatus(guild, status) {
    guild.status = status;
    guild.inactivityTimer = 300;
}

/*
Timer for inactivity. Leave voice channel after 5 minutes of inactivity.
*/
function timer() {
    for (guild in guilds) {
        if (guild.status === 'stopped') guild.inactivityTimer -= 10;
        if (guild.inactivityTimer <= 0) {
            if (guild.voiceConnection) {
                guild.voiceConnection.disconnect();
                guild.voiceConnection = null;
                guild.musicChannel.send(
                    ':no_entry_sign: Leaving voice channel due to inactivity.');

                changeStatus(guild, 'offline');
            }
        }
    }
}
setInterval(timer, 10000);

function command(cmd) {
    return config.prefix + cmd;
}
