/*
Processes music commands and retrieves Songs for guild MusicPlayers.
Also manages MusicPlayer timers.
*/
'use strict';
const config = require('./json/config.json');
const tool = require('./tool.js');

const Song = require('./obj/Song.js');
const MusicPlayer = require('./obj/MusicPlayer.js');

const youtubeDL = require('youtube-dl');
const ytdl = require('ytdl-core');
const rp = require('request-promise');

module.exports.processCommand = processCommand;

let guilds = {};

/*
The music command handler.
*/
function processCommand(msg) {
    if (!msg.guild.available) return;

    //Add guild to the guild list.
    if (!guilds[msg.guild.id])
        guilds[msg.guild.id] = new MusicPlayer();

    let guild = guilds[msg.guild.id];

    let musicCmd = msg.content.split(/\s+/)[1];
    if (musicCmd)
        musicCmd.toLowerCase();
    switch (musicCmd) {
    case 'play':
        return processInput(msg, guild);
    case 'skip':
        return guild.skipSong(msg);
    case 'pause':
        return guild.pauseSong();
    case 'resume':
        return guild.resumeSong();
    case 'queue':
        return guild.printQueue(msg);
    case 'np':
        return guild.nowPlaying(msg);
    case 'vol':
        return guild.setVolume(msg);
    case 'purge':
        return guild.purgeQueue(msg);

    case 'join':
        return guild.joinVc(msg);
    case 'leave':
        return guild.leaveVc(msg);

    case 'hime':
        return hime(msg, guild);
    default:
        msg.channel.send(`Please refer to ${tool.wrap('~help music')}.`);
    }
}

/*
Processes user input for ~play command calls.
Determines what kind of input (search query, youtube video/playlist, soundcloud song/playlist) has been given, and proceeds accordingly.
*/
function processInput(msg, guild) {
    let url = msg.content.split(/\s+/).slice(2).join(' ');
    if (url) {
        if (!url.startsWith('http')) { //Assume its a search.
            processSearch(msg, guild, url);
        } else if (url.search('youtube.com')) { //Youtube.
            let playlist = url.match(/list=(\S+?)(&|\s|$|#)/); //Match playlist id.
            if (playlist) { //Playlist.
                processYoutube.playlist(msg, guild, playlist[1]);
            } else if (url.search(/v=(\S+?)(&|\s|$|#)/)) { //Video.
                processYoutube.song(msg, guild, url);
            } else {
                msg.channel.send(`Invalid Youtube link! ${tool.inaBaka}`);
            }
        } else if (url.search('soundcloud.com')) { //Soundcloud.
            msg.channel.send('Gomen, Soundcloud music isn\'nt functional right now.');
        } else {
            msg.channel.send('Gomen, I only support Youtube right now.');
        }
    }
}

/*
SONG/PLAYLIST PROCESSING FUNCTIONS
*/
/*
Processes a search using youtube-dl, pushing the resulting song to the queue.
@param {String} seachQuery The search query.
*/
function processSearch(msg, guild, searchQuery) {
    searchQuery = 'gvsearch1:' + searchQuery;
    youtubeDL.getInfo(searchQuery, ['--extract-audio', '--buffer-size=4096', '--no-warnings',
        `--username=${config.nico_user}`, `--password=${config.nico_pass}`
    ], {
        maxBuffer: Infinity
    }, (err, song) => {
        if (err) {
            msg.channel.send(`Gomen, I couldn't find a matching song.`);
            return console.log(err);
        }
        guild.queueSong(new Song(song.title, song.url, 'search'));

        msg.channel.send(
            `Enqueued ${tool.wrap(song.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
        );

        if (guild.status != 'playing') {
            guild.playSong(msg, guild);
        }
    });
}

/*
Processing functions for Youtube links.
*/
const processYoutube = {
    /*
    Processes a Youtube song, pushing it to the queue.
    @param {String} url The URL of the new song.
    */
    song(msg, guild, url) {
        ytdl.getInfo(url, (err, song) => {
            if (err) {
                console.log(err);
                msg.channel.send(`Gomen I couldn't queue your song.`);
                return;
            }

            guild.queueSong(new Song(song.title, url, 'youtube'));
            msg.channel.send(
                `Enqueued ${tool.wrap(song.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
            );

            if (guild.status != 'playing') {
                guild.playSong(msg);
            }
        });
    },

    /*
    Processes a Youtube playlist.
    @param {String} playlistId The ID of the Youtube playlist.
    */
    playlist(msg, guild, playlistId) {
        const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3/';

        Promise.all([getPlaylistName(), getPlaylistSongs([], null)])
            .then(results => addToQueue(results[0], results[1]))
            .catch(err => {
                console.log(err);
                msg.channel.send(
                    `${tool.inaError} Gomen, I couldn't add your playlist to the queue. Try again later.`
                )
            });

        async function getPlaylistName() {
            let options = {
                url: `${youtubeApiUrl}playlists?id=${playlistId}&part=snippet&key=${config.youtube_api_key}`
            }
            let body = await rp(options);
            let playlistTitle = JSON.parse(body).items[0].snippet.title;
            return playlistTitle;
        }

        /*
        A recursive function that retrieves the metadata (id and title) of each video in the playlist using the Youtube API.
        @param {Array} playlistItems Array storing metadata of each video in the playlist.
        @param {String} pageToken The next page token response for the playlist if applicable.
        @return {Promise} Resolved with playlist items if playlist metadata succesfully retrieved, rejected if not.
        */
        async function getPlaylistSongs(playlistItems, pageToken) {
            pageToken = pageToken ?
                `&pageToken=${pageToken}` :
                '';

            let options = {
                url: `${youtubeApiUrl}playlistItems?playlistId=${playlistId}${pageToken}&part=snippet&fields=nextPageToken,items(snippet(title,resourceId/videoId))&maxResults=50&key=${config.youtube_api_key}`
            }

            let body = await rp(options);
            let playlist = JSON.parse(body);
            playlistItems = playlistItems.concat(playlist.items.filter( //Concat all non-deleted videos.
                item => item.snippet.title != 'Deleted video'));

            if (playlist.hasOwnProperty('nextPageToken')) { //More videos in playlist.
                playlistItems = await getPlaylistSongs(playlistItems, playlist.nextPageToken);
            }

            return playlistItems;
        }

        /*
        Processes the playlist metadata, adding songs to the queue.
        @param {Array} playlistItems The metadata of each video in the playlist.
        */
        async function addToQueue(playlistTitle, playlistItems) {
            let queueLength = guild.queue.length;

            for (let i = 0; i < playlistItems.length; i++) {
                let song = new Song(
                    playlistItems[i].snippet.title,
                    `https://www.youtube.com/watch?v=${playlistItems[i].snippet.resourceId.videoId}`,
                    'youtube');
                guild.queueSong(song, i + queueLength);
            }

            msg.channel.send(
                `Enqueued ${tool.wrap(playlistItems.length)} songs from ${tool.wrap(playlistTitle)} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`
            );

            if (guild.status != 'playing') {
                guild.playSong(msg);
            }
        }
    },
}

/*
Hime hime.
*/
function hime(msg, guild) {
    msg.content = '~music play koi no hime pettanko';
    processInput(msg, guild);
}

/*
Timer for inactivity. Leave voice channel after inactivity timer expires.
*/
function timer() {
    for (let guildId in guilds) {
        let guild = guilds[guildId];
        if (guild.status == 'stopped' || guild.status == 'paused')
            guild.inactivityTimer -= 10;
        if (guild.inactivityTimer <= 0) {
            guild.voiceConnection.disconnect();
            guild.voiceConnection = null;
            guild.musicChannel.send(
                ':no_entry_sign: Leaving voice channel due to inactivity.');

            guild.changeStatus('offline');
        }
    }
}
setInterval(timer, 10000);
