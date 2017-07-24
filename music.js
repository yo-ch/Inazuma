'use strict';
const config = require('./config.json');
const tool = require('./tool.js');
const ani = require('./anime.js');

const youtubeDL = require('youtube-dl');
const request = require('request');
const rp = require('request-promise');

var guilds = {};

module.exports = function (client) {
    client.on('message', msg => { //Respond to music requests.
        if (msg.author.bot) return;
        if (!msg.content.startsWith(config.prefix)) return; //Not a command.
        if (!msg.guild || !msg.guild.available) return;

        //Add guild to the guild list.
        if (!guilds[msg.guild.id]) guilds[msg.guild.id] = {
            queue: [],
            musicChannel: msg.guild.channels.find('name', 'music'),
            voiceConnection: null,
            dispatch: null,
            status: 'offline', //States: offline, playing, stopped
            inactivityTimer: 60
        };

        var guild = guilds[msg.guild.id];

        if (!guild.musicChannel) {
            guild.musicChannel = msg.guild.channels.find('name', 'music');
            if (!guild.musicChannel) {
                msg.channel.send(`Please create a ${tool.wrap('#music')} channel!`);
                return;
            }
        }

        var cmd = msg.content.split(/\s+/)[0].slice(config.prefix.length);

        switch (cmd) {
            case 'play':
                return processInput(msg, guild);
            case 'skip':
                return skipSong(guild);
            case 'pause':
                return pauseSong(guild);
            case 'resume':
                return resumeSong(guild);
            case 'queue':
                return printQueue(guild);
            case 'np':
                return nowPlaying(msg, guild);
            case 'vol':
                return setVolume(msg, guild);

            case 'join':
                return join(msg, guild);
            case 'leave':
                return leave(msg, guild);

            case 'hime':
                return hime(msg, guild);
            case 'music':
                msg.channel.send(`Please refer to ${tool.wrap('~help music')}.`);
        }
    });
}

/*
Processes user input for ~play command calls.

Determines what kind of input (search query, youtube video/playlist, soundcloud song/playlist) has been given, and proceeds accordingly.
*/
function processInput(msg, guild) {
    var url = msg.content.split(/\s+/).slice(1).join(' ');
    if (url) {
        if (!url.startsWith('http')) { //Assume its a search.
            url = 'gvsearch1:' + url;
            youtubeDL.getInfo(url, (err, info) => {
                if (err) return guild.musicChannel.send(`Invalid video, ${ani.tsunNoun()}!`);
                queueSong(msg, guild, info);
                guild.musicChannel.send(
                    `Enqueued ${tool.wrap(info.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
                );
            });
        } else if (url.search('youtube.com')) { //Youtube.
            var playlist = url.match(/list=(\S+?)(&|\s|$)/); //Match playlist id.
            if (playlist) { //Playlist.
                processYoutubePlaylist(msg, guild, url, playlist[1]);
            } else { //Video.
                if (url.search(/list=(\S+?)(&|\s|$)/)) { //Valid video url.
                    if (guild.queue.length > 5) queueSong(msg, guild, url);
                    else processSongNew(msg, guild, url);
                } else {

                }
            }
        } else if (url.search('soundcloud.com')) { //Soundcloud.

        } else {
            msg.channel.send('Gomen, I only support Youtube and Soundcloud.');
        }
    }
}

function processSongInQueue(msg, guild, song, index) {
    if (!song) return setTimeout(processSongInQueue, 5000);

    youtubeDL.getInfo(song.url, (err, info) => {
        if (err) return guild.musicChannel.send(`Invalid video, ${ani.tsunNoun()}!`);
        queueSong(msg, guild, { title: song.title, url: info.url }, index);
    });
}

function processSongNew(msg, guild, url) {
    youtubeDL.getInfo(url, (err, info) => {
        if (err) return guild.musicChannel.send(`Invalid video, ${ani.tsunNoun()}!`);
        queueSong(msg, guild, info);
    });
}

function processYoutubePlaylist(msg, guild, url, playlistId) {
    const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3/';

    var options;
    var playlistTitle = 'N/A';
    options = {
        url: `${youtubeApiUrl}playlistItems?playlistId=${playlistId}&part=snippet&fields=items(snippet(title,resourceId/videoId))&maxResults=50&key=${config.youtube_api_key}`
    }
    rp(options).then(body => {
        var playlistItems = JSON.parse(body).items;
        var processNo = 5 - guild.queue.length;
        for (let i = 0; i < processNo && i < playlistItems.length; i++) { //Get stream url to fill song queue up to 5.
            youtubeDL.getInfo(
                `https://www.youtube.com/watch?v=${playlistItems[i].snippet.resourceId.videoId}`,
                (err, info) => {
                    queueSong(msg, guild, {
                        title: info.title,
                        url: info.url,
                    }, i);
                });
        }

        //Add rest of songs to queue, which will be processed later, to avoid spamming I/O.
        if (processNo < 0) processNo = 0;
        for (let i = processNo; i < playlistItems.length; i++) {
            var info = {
                title: playlistItems[i].snippet.title,
                url: `https://www.youtube.com/watch?v=${playlistItems[i].snippet.resourceId.videoId}`,
            }
            queueSong(msg, guild, info, i);
        }
        options = {
            url: `${youtubeApiUrl}playlists?id=${playlistId}&part=snippet&key=${config.youtube_api_key}`
        }
        rp(options).then(body => {
            playlistTitle = JSON.parse(body).items[0].snippet.title;
            guild.musicChannel.send(
                `Enqueued ${tool.wrap(playlistItems.length)} songs in ${tool.wrap(playlistTitle)} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
            );
            if (!guild.voiceConnection)
                msg.channel.send(
                    `Please summon me using ${tool.wrap('~join')} to start playing the queue.`
                );
        })
    });
}

/*
Adds the song to the queue.
*/
function queueSong(msg, guild, info) {
    var index;
    if (arguments.length == 4) index = arguments[3];
    if (index || index == 0) {
        guild.queue[index] = { title: info.title.trim(), url: info.url };
    } else
        guild.queue.push({ title: info.title.trim(), url: info.url });
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
                msg.channel.send(
                    `Please summon me using ${tool.wrap('~join')} to start playing the queue.`
                )
            }
        }).then(() => {
            //Play song and retrieve the stream URL of the 5th song in the queue.
            changeStatus(guild, 'playing');
            processSongInQueue(msg, guild, guild.queue[4], 4)

            var music = guild.queue[0];
            if (!music)
                setTimeout(() => {
                    music = guild.queue[0];
                    if (music) startSong();
                    else {
                        guild.queue.shift();
                        playSong(msg, guild);
                    }
                }, 5000);
            else
                startSong();

            function startSong() {
                guild.musicChannel.send(`:notes: Now playing ${tool.wrap(music.title)}`);

                guild.dispatch = guild.voiceConnection.playArbitraryInput(
                    request(music.url, function (err, response, body) {
                        if (err) console.log(err);
                    }));

                //Wait for errors/end of song, then play the next song.
                guild.dispatch.on('error', error => {
                    console.log(error);
                    console.log('Error while playing song.');
                    guild.queue.shift();
                    playSong(msg, guild);
                });

                guild.dispatch.on('end', reason => {
                    if (reason != 'leave') {
                        guild.queue.shift();
                        setTimeout(function () { //Deal event firing twice glitch on dispatch end.
                            playSong(msg, guild);
                        }, 50)
                    }
                });
            }
        }).catch((err) => {
            console.log(err);
        });
    }
}

/*
Skips the current song.
*/
function skipSong(guild) {
    if (guild.dispatch) {
        guild.musicChannel.send(`:fast_forward: Skipped ${tool.wrap(guild.queue[0].title)}.`);
        guild.dispatch.end();
    } else
        guild.musicChannel.send(`There\'s nothing to skip! ${tool.inaBaka}`);
}

/*
Pauses the stream.
*/
function pauseSong(guild) {
    if (guild.queue.length > 0) {
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
    if (guild.queue.length > 0) {
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
        try {
            var queueString = '';
            for (var i = 0; i < guild.queue.length && i < 15; i++)
                queueString += `${i+1}. ${guild.queue[i].title}\n`;
            if (guild.queue.length > 15) queueString += `\nand ${guild.queue.length-15} more.`;
            guild.musicChannel.send(queueString, { 'code': true });
        } catch (err) {
            console.log('ERROR CAUGHT:\n' + err);
            guild.musicChannel.send(
                `${tool.inaError} Gomen, I can't display the queue right now. Try again in a few moments onegai.`
            );
        }
    } else {
        guild.musicChannel.send(`There are no songs in the queue!`);
    }
}

/*
Displays the currently playing song.
*/
function nowPlaying(msg, guild) {
    if (guild.queue.length > 0)
        guild.musicChannel.send(`:notes: Now playing ${tool.wrap(guild.queue[0].title)}.`);
    else
        guild.musicChannel.send('Nothing is playing right now.');
}

/*
Sets the volume of the stream.
*/
function setVolume(msg, guild) {
    var vol = parseInt(msg.content.split(/\s+/)[1]) / 100;
    if (vol && (vol >= 0 && vol <= 1)) {
        if (guild.dispatch) {
            guild.dispatch.setVolume(vol);
            guild.musicChannel.send(`:speaker:Volume set to ${tool.wrap(vol*100)}`);
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
function join(msg, guild) {
    if (msg.member.voiceChannel) {
        msg.member.voiceChannel.join().then(connection => {
            guild.voiceConnection = connection;
            guild.musicChannel.send(
                `Joining **${msg.member.voiceChannel.name}**.`);
            changeStatus(guild, 'stopped');
            if (guild.queue.length > 0) playSong(msg, guild);
        })
    } else {
        msg.channel.send(`You\'re not in a voice channel! ${tool.inaBaka}`);
    }
}

function leave(msg, guild) {
    if (guild.voiceConnection) {
        guild.musicChannel.send(`Leaving **${guild.voiceConnection.channel.name}**.`);
        if (guild.dispatch) guild.dispatch.end('leave');
        guild.voiceConnection.disconnect();

        changeStatus(guild, 'offline');

        guild.voiceConnection = null;
        guild.dispatch = null;
    } else {
        guild.musicChannel.send(`I'm not in a voice channel! ${tool.inaBaka}`);
    }
}

/*
Hime hime.
*/
function hime(msg, guild) {
    msg.content = '~play https://soundcloud.com/shiinub/namirin-koi-no-hime-hime-pettanko';
    processInput(msg, guild);
}

function changeStatus(guild, status) {
    guild.status = status;
    guild.inactivityTimer = 60;
}

/*
Timer for inactivity. Leave voice channel after 5 minutes of inactivity.
*/
function timer() {
    for (var guildId in guilds) {
        var guild = guilds[guildId];
        if (guild.status === 'stopped') guild.inactivityTimer -= 10;
        if (guild.inactivityTimer <= 0) {
            guild.voiceConnection.disconnect();
            guild.voiceConnection = null;
            guild.musicChannel.send(':no_entry_sign: Leaving voice channel due to inactivity.');

            changeStatus(guild, 'offline');
        }
    }
}
setInterval(timer, 10000);
