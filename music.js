'use strict';
const config = require('./config.json');
const tool = require('./tool.js');
const ani = require('./anime.js');

const youtubeDL = require('youtube-dl');
const ytdl = require('ytdl-core');
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
            volume: 1,
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
            case 'purge':
                return purge(guild);

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
            processSearch(msg, guild, url);
        } else if (url.search('youtube.com')) { //Youtube.
            var playlist = url.match(/list=(\S+?)(&|\s|$|#)/); //Match playlist id.
            if (playlist) { //Playlist.
                youtube.processPlaylist(msg, guild, playlist[1]);
            } else if (url.search(/v=(\S+?)(&|\s|$|#)/)) { //Video.
                youtube.processSongNew(msg, guild, url);
            } else {
                msg.channel.send(`Invalid Youtube link! ${inaBaka}`);
            }
        } else if (url.search('soundcloud.com')) { //Soundcloud.

        } else {
            msg.channel.send('Gomen, I only support Youtube and Soundcloud.');
        }
    }
}

const youtube = {
    processSearch: function (msg, guild, url) {
        url = 'gvsearch1:' + url;
        youtubeDL.getInfo(url, (err, info) => {
            if (err) console.log(err);
            queueSong(msg, guild, info);
            guild.musicChannel.send(
                `Enqueued ${tool.wrap(info.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
            );
            if (guild.status != 'playing') playSong(msg, guild);
        });
    },

    processSongNew: function (msg, guild, url) {
        ytdl.getInfo(url, (err, info) => {
            if (err) console.log(info);
            var stream = ytdl.downloadFromInfo(info, { retries: 7, highWaterMark: 32768 });
            queueSong(msg, guild, { title: info.title, url: stream, processed: true });

            guild.musicChannel.send(
                `Enqueued ${tool.wrap(info.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
            );
            if (guild.status != 'playing') playSong(msg, guild);
        });
    },

    processSongAtIndex: function (msg, guild, song, index) {
        if (song && !song.hasOwnProperty('processed')) {
            var stream = ytdl(song.url, { retries: 7, highWaterMark: 32768 });
            queueSong(msg, guild, { title: song.title, url: stream, processed: true },
                index);
        }
    },

    processPlaylist: function (msg, guild, playlistId) {
        const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3/';

        getPlaylistInfo([], null, processPlaylistInfo);

        function getPlaylistInfo(playlistItems, pageToken, callback) {
            pageToken = pageToken ? `&pageToken=${pageToken}` : '';

            var options;
            options = {
                url: `${youtubeApiUrl}playlistItems?playlistId=${playlistId}${pageToken}&part=snippet&fields=nextPageToken,items(snippet(title,resourceId/videoId))&maxResults=50&key=${config.youtube_api_key}`
            }
            rp(options).then(body => {
                var playlist = JSON.parse(body);
                playlistItems = playlistItems.concat(playlist.items.filter(item =>
                    item.snippet.title != 'Deleted video'));

                if (playlist.hasOwnProperty('nextPageToken'))
                    getPlaylistInfo(playlistItems, playlist.nextPageToken, callback);
                else callback(playlistItems);
            });
        }

        function processPlaylistInfo(playlistItems) {
            var processNo = 6 - guild.queue.length;
            var queueLength = guild.queue.length;
            for (let i = 0; i < playlistItems.length; i++)
                guild.queue.push(null);
            for (let i = 0; i < processNo && i < playlistItems.length; i++) { //Get stream urls to fill song queue up to 5.
                var info = {
                    title: playlistItems[i].snippet.title,
                    url: `https://www.youtube.com/watch?v=${playlistItems[i].snippet.resourceId.videoId}`
                }
                youtube.processSongAtIndex(msg, guild, info, i + queueLength);
            }

            //Add rest of songs to queue, which will be processed later, to avoid spamming I/O.
            if (processNo < 0) processNo = 0;
            for (let i = processNo; i < playlistItems.length; i++) {
                var info = {
                    title: playlistItems[i].snippet.title,
                    url: `https://www.youtube.com/watch?v=${playlistItems[i].snippet.resourceId.videoId}`
                }
                queueSong(msg, guild, info, i + queueLength);
            }
            var options = {
                url: `${youtubeApiUrl}playlists?id=${playlistId}&part=snippet&key=${config.youtube_api_key}`
            }

            rp(options).then(body => { //Get playlist name.
                var playlistTitle = JSON.parse(body).items[0].snippet.title;
                guild.musicChannel.send(
                    `Enqueued ${tool.wrap(playlistItems.length)} songs from ${tool.wrap(playlistTitle)} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
                );

                if (guild.status != 'playing') playSong(msg, guild);
            })
        }
    }
}

/*
Adds the song (processed or unprocessed) to the queue.
*/
function queueSong(msg, guild, song) {
    var index;
    if (arguments.length == 4) index = arguments[3];

    var songInfo = {
        title: song.title ? song.title.trim() : 'N/A',
        url: song.url,
    }
    if (song.hasOwnProperty('processed')) songInfo['processed'] = true;

    if (index || index == 0) {
        guild.queue[index] = songInfo;
    } else
        guild.queue.push(songInfo);
}

/*
Plays the first song in the queue.
*/
function playSong(msg, guild) {
    if (guild.queue.length === 0) {
        guild.musicChannel.send('Queue complete.');
        changeStatus(guild, 'stopped');
    } else {
        joinVoiceChannel(msg, guild).then(() => {
            var music = guild.queue[0];
            //Song not processed yet, try again, and if needed skip the song.
            if (!music)
                setTimeout(() => {
                    music = guild.queue[0];
                    if (music) startSong();
                    else {
                        console.log(`${tool.inaError} Could not play song, skipping to next song.`);
                        guild.queue.shift();
                        playSong(msg, guild);
                    }
                }, 5000);
            else
                startSong();

            //Play song and process the 6th song in the queue.
            function startSong() {
                youtube.processSongAtIndex(msg, guild, guild.queue[5], 5);
                changeStatus(guild, 'playing');
                guild.musicChannel.send(`:notes: Now playing ${tool.wrap(music.title)}`).then(
                    function () {
                        guild.dispatch = guild.voiceConnection.playArbitraryInput(music
                            .url, { seek: 0, passes: 2, volume: guild.volume });

                        //Wait for errors/end of song, then play the next song.
                        guild.dispatch.on('error', error => {
                            console.log('error:' + error);
                            guild.dispatch = null;
                            guild.queue.shift();
                            playSong(msg, guild);
                        });

                        guild.dispatch.on('end', reason => {
                            console.log('end:' + reason);
                            guild.dispatch = null;
                            if (reason != 'leave') {
                                guild.queue.shift();
                                setTimeout(function () { //Deal with event firing twice bug on dispatch end.
                                    playSong(msg, guild);
                                }, 100)
                            }
                        });

                        guild.dispatch.on('debug', info => {
                            console.log(info);
                        })
                    }).catch(() => {});
            }
        }).catch(() => {
            msg.channel.send(
                `Please summon me using ${tool.wrap('~join')} to start playing the queue.`
            );
        });
    }
}

function joinVoiceChannel(msg, guild) {
    return new Promise((resolve, reject) => {
        if (guild.voiceConnection) {
            resolve();
        } else {
            reject();
        }
    });
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

function purgeQueue(guild) {
    guild.queue = [];
    guild.musicChannel.send('The queue has been cleared.');
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
            guild.volume = vol;
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
Timer for inactivity. Leave voice channel after 1 minutes of inactivity.
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
