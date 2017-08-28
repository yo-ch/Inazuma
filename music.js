'use strict';
const config = require('./config.json');
const tool = require('./tool.js');
const ani = require('./anime.js');

const youtubeDL = require('youtube-dl');
const ytdl = require('ytdl-core');
const rp = require('request-promise');

var guilds = {};

module.exports.processCommand = function (msg) {
    //Add guild to the guild list.
    if (!guilds[msg.guild.id])
        guilds[msg.guild.id] = {
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

    var musicCmd = msg.content.split(/\s+/)[1];
    if (musicCmd)
        musicCmd.toLowerCase();
    switch (musicCmd) {
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
            return purgeQueue(guild);

        case 'join':
            return join(msg, guild);
        case 'leave':
            return leave(msg, guild);

        case 'hime':
            return hime(msg, guild);
        default:
            msg.channel.send(`Please refer to ${tool.wrap('~help music')}.`);
    }
}

/*
Common Params:
@param Object msg - The message that called the command.
@param Object guild - The guild that the message is from.

Song object:
  String title - Title of the song.
  Object url - The url/data needed to get the stream or the stream url of the song.
  String type - The type of song (youtube, soundcloud, search).
*/

/*
Processes user input for ~play command calls.

Determines what kind of input (search query, youtube video/playlist, soundcloud song/playlist) has been given, and proceeds accordingly.
*/
function processInput(msg, guild) {
    var url = msg.content.split(/\s+/).slice(2).join(' ');
    if (url) {
        if (!url.startsWith('http')) { //Assume its a search.
            processSearch(msg, guild, url);
        } else if (url.search('youtube.com')) { //Youtube.
            var playlist = url.match(/list=(\S+?)(&|\s|$|#)/); //Match playlist id.
            if (playlist) { //Playlist.
                youtube.processPlaylist(msg, guild, playlist[1]);
            } else if (url.search(/v=(\S+?)(&|\s|$|#)/)) { //Video.
                youtube.processSong(msg, guild, url);
            } else {
                msg.channel.send(`Invalid Youtube link! ${inaBaka}`);
            }
        } else if (url.search('soundcloud.com')) { //Soundcloud.
            msg.channel.send('Gomen, Soundcloud music isn\'nt functional right now.');
        } else {
            msg.channel.send('Gomen, I only support Youtube right now.');
        }
    }
}

/*
Processes a search using youtube-dl, pushing the resulting song to the queue.

@param String seachQuery - The search query.
*/
function processSearch(msg, guild, searchQuery) {
    searchQuery = 'gvsearch1:' + searchQuery;
    youtubeDL.getInfo(searchQuery, ['--extract-audio'], (err, info) => {
        if (err)
            console.log(err);
        queueSong(msg, guild, {
            title: info.title,
            url: info.url,
            type: 'search'
        });
        guild.musicChannel.send(
            `Enqueued ${tool.wrap(info.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
        );

        if (guild.status != 'playing')
            playSong(msg, guild);
    });
}

/*
Processing functions for Youtube links.
*/
const youtube = {
    /*
    Processes a new song, pushing it to the queue.

    @param String url - The URL of the new song.
    */
    processSong(msg, guild, url) {
        ytdl.getInfo(url, (err, info) => {
            if (err)
                console.log(info);

            queueSong(msg, guild, {
                title: info.title,
                url: url,
                type: 'youtube'
            });

            guild.musicChannel.send(
                `Enqueued ${tool.wrap(info.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
            );
            if (guild.status != 'playing')
                playSong(msg, guild);
        });
    },

    /*
    Processes a Youtube playlist.

    @param String playlistId - the ID of the Youtube playlist.
    */
    processPlaylist(msg, guild, playlistId) {
        const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3/';

        getPlaylistInfo([], null).then(playlistItems => processPlaylistInfo(playlistItems)).catch(
            () => guild.musicChannel.send(
                `${tool.inaError} Gomen, I couldn't add your playlist to the queue. Try again later.`
            ));

        /*
        A recursive function that retrieves the metadata (id and title) of each video in the playlist using the Youtube API.

        @param Array playlistItems - The metadata of each video in the playlist.
        @param String pageToken - The next page token response for the playlist if applicable.

        @return Promise - Resolved if playlist metadata succesfully retrieved, rejected if not.
        */
        function getPlaylistInfo(playlistItems, pageToken) {
            return new Promise((resolve, reject) => {
                pageToken = pageToken ?
                    `&pageToken=${pageToken}` :
                    '';

                var options;
                options = {
                    url: `${youtubeApiUrl}playlistItems?playlistId=${playlistId}${pageToken}&part=snippet&fields=nextPageToken,items(snippet(title,resourceId/videoId))&maxResults=50&key=${config.youtube_api_key}`
                }
                rp(options).then(body => {
                    var playlist = JSON.parse(body);
                    playlistItems = playlistItems.concat(playlist.items.filter(
                        item => item.snippet.title != 'Deleted video'));

                    if (playlist.hasOwnProperty('nextPageToken'))
                        getPlaylistInfo(playlistItems, playlist.nextPageToken).then(
                            playlistItems => resolve(playlistItems)).catch(
                            reject);
                    else
                        resolve(playlistItems);
                }).catch(reject);
            });
        }

        /*
        Processes the playlist metadata, adding songs to the queue.

        @param Array playlistItems - The metadata of each video in the playlist.
        */
        function processPlaylistInfo(playlistItems) {
            var queueLength = guild.queue.length;

            for (let i = 0; i < playlistItems.length; i++) {
                var info = {
                    title: playlistItems[i].snippet.title,
                    url: `https://www.youtube.com/watch?v=${playlistItems[i].snippet.resourceId.videoId}`,
                    type: 'youtube'
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

                if (guild.status != 'playing')
                    playSong(msg, guild);
            })
        }
    },

    /*
    Gets the readable stream of the given song.

    @param Object song - The song to get the stream of.
    */
    getStream(song) {
        if (song) {
            var stream = ytdl(song.url, {
                retries: 7,
                highWaterMark: 32768,
                filter: 'audioonly'
            });
            return stream;
        }
    }
}

/*
Adds the song to the queue.
If an index argument is included, insert the song at that index instead of pushing it to the queue.

@param Object song - The song to queue.
@param Number [index] - The index to insert the song at.
*/
function queueSong(msg, guild, song) {
    var index;
    if (arguments.length == 4)
        index = arguments[3];

    var songInfo = {
        title: song.title ?
            song.title.trim() : 'N/A',
        url: song.url,
        type: song.type
    }

    if (index || index == 0) {
        guild.queue[index] = songInfo;
    } else {
        guild.queue.push(songInfo);
    }
}

/*
A recursive function that plays the queue.
*/
function playSong(msg, guild) {
    if (guild.queue.length === 0) {
        guild.musicChannel.send('Queue complete.');
        changeStatus(guild, 'stopped');
    } else {
        joinVoiceChannel().then(() => {
            var song = guild.queue[0];
            var stream;
            if (song.type == 'youtube')
                stream = youtube.getStream(song);
            else //(song.type == 'soundcloud' || song.type =='search')
                stream = song.url;

            guild.musicChannel.send(`:notes: Now playing ${tool.wrap(song.title)}`).then(() => {
                changeStatus(guild, 'playing');
                guild.dispatch = guild.voiceConnection.playStream(stream, {
                    passes: 2,
                    volume: guild.volume
                });

                guild.dispatch.on('error', error => {
                    console.log('error:' + error);
                    guild.dispatch = null;
                    guild.queue.shift();
                    playSong(msg, guild);
                });

                guild.dispatch.on('end', reason => {
                    console.log('end:' + reason);
                    guild.dispatch = null;
                    guild.queue.shift();
                    if (reason != 'leave') {
                        playSong(msg, guild);
                    }
                });

                guild.dispatch.on('debug', info => {
                    console.log(info);
                });
            }).catch(() => {});
        }).catch(() => {
            msg.channel.send(
                `Please summon me using ${tool.wrap('~music join')} to start playing the queue.`
            );
        });
    }

    /*
    Resolves the voice channel.

    @return Promise - resolved if the bot is connected to a voice channel, and rejected if not.
    */
    function joinVoiceChannel() {
        return new Promise((resolve, reject) => {
            if (guild.voiceConnection)
                resolve();
            else
                reject();
        });
    }
}

/*
Skips the current song.
*/
function skipSong(guild) {
    if (guild.dispatch) {
        guild.musicChannel.send(`:fast_forward: Skipped ${tool.wrap(guild.queue[0].title)}`);
        guild.dispatch.end();
    } else {
        guild.musicChannel.send(`There\'s nothing to skip! ${tool.inaBaka}`);
    }
}

/*
Pauses the dispatcher.
*/
function pauseSong(guild) {
    if (guild.dispatch)
        guild.dispatch.pause();
    else
        guild.musicChannel.send(`Nothing is playing right now. ${tool.inaBaka}`);
}

/*
Resumes the dispatcher.
*/
function resumeSong(guild) {
    if (guild.dispatch)
        guild.dispatch.resume();
    else
        guild.musicChannel.send(`Nothing is playing right now. ${tool.inaBaka}`);

}

/*
Prints the queue.
*/
function printQueue(guild) {
    if (guild.queue.length > 0) {
        try {
            var queueString = '';
            for (var i = 0; i < guild.queue.length && i < 15; i++)
                queueString += `${i + 1}. ${guild.queue[i].title}\n`;
            if (guild.queue.length > 15)
                queueString += `\nand ${guild.queue.length - 15} more.`;
            guild.musicChannel.send(queueString, {
                'code': true
            });
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
Clears the queue.
*/
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
Sets the volume of the dispatcher.
*/
function setVolume(msg, guild) {
    var vol = parseInt(msg.content.split(/\s+/)[2]) / 100;
    if (vol && (vol >= 0 && vol <= 1)) {
        if (guild.dispatch) {
            guild.dispatch.setVolume(vol);
            guild.volume = vol;
            guild.musicChannel.send(`:speaker:Volume set to ${tool.wrap(vol * 100)}`);
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
            guild.musicChannel.send(`Joining **${msg.member.voiceChannel.name}**.`);
            changeStatus(guild, 'stopped');
            if (guild.queue.length > 0)
                playSong(msg, guild);
        })
    } else {
        msg.channel.send(`You\'re not in a voice channel! ${tool.inaBaka}`);
    }
}

/*
Disconnects from the voice channel.
*/
function leave(msg, guild) {
    if (guild.voiceConnection) {
        guild.musicChannel.send(`Leaving **${guild.voiceConnection.channel.name}**.`);
        if (guild.dispatch)
            guild.dispatch.end('leave');
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
    msg.content = '~music play koi no hime pettanko';
    processInput(msg, guild);
}

/*
Changes the status of the bot.
*/
function changeStatus(guild, status) {
    guild.status = status;
    guild.inactivityTimer = status == 'paused' ?
        600 :
        60;
}

/*
Timer for inactivity. Leave voice channel after 1 minute of inactivity.
*/
function timer() {
    for (var guildId in guilds) {
        var guild = guilds[guildId];
        if (guild.status == 'stopped' || guild.status == 'paused')
            guild.inactivityTimer -= 10;
        if (guild.inactivityTimer <= 0) {
            guild.voiceConnection.disconnect();
            guild.voiceConnection = null;
            guild.musicChannel.send(':no_entry_sign: Leaving voice channel due to inactivity.');

            changeStatus(guild, 'offline');
        }
    }
}
setInterval(timer, 10000);
