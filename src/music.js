/*
Processes music commands. Constructs Songs and manages MusicPlayers.
*/
'use strict';
const config = require('./config.json');
const tool = require('./util/tool.js');

const Song = require('./lib/music/Song.js');
const MusicPlayer = require('./lib/music/MusicPlayer.js');
const RichEmbed = require('discord.js').RichEmbed;

const youtubeDL = require('youtube-dl');
const ytdl = require('ytdl-core');
const rp = require('request-promise');

module.exports.processCommand = processCommand;

let guilds = {};

const Status = {
    OFFLINE: 0,
    STOPPED: 1,
    PAUSED: 2,
    PLAYING: 3
};

/*
The music command handler.
*/
function processCommand(msg) {
    if (!msg.guild.available) return;

    //Add guild to the guild list.
    if (!guilds[msg.guild.id])
        guilds[msg.guild.id] = new MusicPlayer(msg);

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
    case 'shuffle':
        return guild.shuffleQueue(msg);

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
    let url = msg.content.substring(msg.content.indexOf(' ', msg.content.indexOf(' ') + 1) + 1);
    if (url && url !== '') {
        if (!url.startsWith('http')) { //Assume its a search.
            processSearch(msg, guild, url);
        } else if (url.search('youtube.com')) { //Youtube.
            let playlist = url.match(/list=(\S+?)(&|\s|$|#)/); //Match playlist id.
            if (playlist) { //Playlist.
                processYoutube.playlist(msg, guild, playlist[1]);
            } else if (url.search(/v=(\S+?)(&|\s|$|#)/)) { //Video.
                processYoutube.song(msg, guild, url);
            } else {
                msg.channel.send(`Invalid Youtube link!`);
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
    searchQuery = 'ytsearch1:' + searchQuery;
    youtubeDL.getInfo(searchQuery, [ '--extract-audio', '--buffer-size=4096', '--no-warnings'
    ], {
        maxBuffer: Infinity
    }, (err, song) => {
        if (err) {
            msg.channel.send(`Gomen, I couldn't find a matching song.`);
            return console.log(err);
        }

        let match = song.duration.match(/(\d+):(\d+)/);
        let duration = match != null ? parseInt(match[1]) * 60 + parseInt(match[2]) : 'N/A';

        guild.queueSong(new Song(song.title, `https://youtube.com/watch?v=${song.id}`,
            'search', duration, song.url, song.thumbnail));

        msg.channel.send(
            new RichEmbed({ description: `Enqueued ${tool.wrap(song.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)}`})
        );

        if (guild.status != Status.PLAYING) {
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
            guild.queueSong(new Song(song.title, url, 'youtube', song.length_seconds,
                null,
                `https://img.youtube.com/vi/${song.video_id}/mqdefault.jpg`));
            msg.channel.send(
                new RichEmbed({ description: `Enqueued ${tool.wrap(song.title.trim())} to position **${guild.queue.length}** `})
            );

            if (guild.status != Status.PLAYING) {
                guild.playSong(msg);
            }
        });
    },

    /*
    Processes a Youtube playlist.
    @param {String} playlistId The ID of the Youtube playlist.
    */
    playlist(msg, guild, playlistId) {
        const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3';

        Promise.all([getPlaylistName(), getPlaylistSongs([], null)])
            .then(results => addToQueue(results[0], results[1]))
            .catch(err => {
                console.log(err);
                msg.channel.send(
                    `Gomen, I couldn't add your playlist to the queue. Try again later.`
                )
            });

        async function getPlaylistName() {
            let options = {
                url: `${youtubeApiUrl}/playlists?id=${playlistId}&part=snippet&key=${config.youtube_api_key}`
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
                url: `${youtubeApiUrl}/playlistItems?playlistId=${playlistId}${pageToken}&part=snippet&fields=nextPageToken,items(snippet(title,resourceId/videoId))&maxResults=50&key=${config.youtube_api_key}`
            }

            let body = await rp(options);
            let playlist = JSON.parse(body);
            playlistItems = playlistItems.concat(playlist.items.filter( //Concat all non-deleted videos.
                item => item.snippet.title.search('Deleted video') == -1));

            if (playlist.hasOwnProperty('nextPageToken')) { //More videos in playlist.
                playlistItems = await getPlaylistSongs(playlistItems, playlist.nextPageToken);
            }

            return playlistItems;
        }

        /*
        Processes the playlist metadata, adding songs to the queue.
        @param {Array} playlistItems The metadata of each video in the playlist.
        */
        function addToQueue(playlistTitle, playlistItems) {
            let queueLength = guild.queue.length;

            for (let i = 0; i < playlistItems.length; i++) {
                let song = new Song(
                    playlistItems[i].snippet.title,
                    `https://www.youtube.com/watch?v=${playlistItems[i].snippet.resourceId.videoId}`,
                    'youtubepl');
                guild.queueSong(song, i + queueLength);
            }

            msg.channel.send(
                new RichEmbed({
                    description: `Enqueued ${tool.wrap(playlistItems.length)} songs from ${tool.wrap(playlistTitle)} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)}`
                })
            );

            if (guild.status != Status.PLAYING) {
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
        if (guild.status === Status.STOPPED || guild.status === Status.PAUSED)
            guild.inactivityTimer -= 10;
        if (guild.inactivityTimer <= 0) {
            guild.voiceConnection.disconnect();
            guild.voiceConnection = null;
            guild.musicChannel.send(
                new RichEmbed({ description: ':no_entry_sign: Leaving voice channel due to inactivity.' })
            );

            guild.changeStatus(Status.OFFLINE);
        }
    }
}
setInterval(timer, 10000);
