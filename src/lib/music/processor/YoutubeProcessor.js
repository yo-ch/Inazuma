const AbstractSongProcessor = require('../../base/AbstractSongProcessor.js');
const Song = require('../Song.js');
const config = require('../../../config.json');
const util = require('../../../util/util.js');

const { google } = require('googleapis');
const youtube = google.youtube('v3');
const ytdl = require('ytdl-core');

class YoutubeProcessor extends AbstractSongProcessor {
    static get songType() {
        return 'youtube';
    }

    static isValidRequest(url) {
        return YoutubeProcessor.isValidSong(url) || YoutubeProcessor.isValidPlaylist(url);
    }

    static isValidSong(url) {
        return url.search(/v=(\S+?)(&|\s|$|#)/) > -1;
    }

    static isValidPlaylist(url) {
        return url.search(/list=(\S+?)(&|\s|$|#)/) > -1;
    }

    static async processSong(url) {
        const { title, lengthSeconds, videoId } = (await ytdl.getInfo(url)).player_response.videoDetails;

        return new Song({
            title,
            url,
            duration: lengthSeconds,
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            processor: YoutubeProcessor
        });
    }

    static async processPlaylist(url) {
        const playlistId = url.match(/list=(\S+?)(&|\s|$|#)/)[1];
        const [name, songs] = await Promise.all([getPlaylistName(playlistId), getPlaylistSongs(playlistId)]);
        return { name, songs };

        async function getPlaylistName(playlistId) {
            const options = {
                key: config.youtube_api_key,
                id: playlistId,
                part: 'snippet'
            };

            const playlistTitle = (await youtube.playlists.list(options)).data.items[0].snippet.title;
            return playlistTitle;
        }

        async function getPlaylistSongs(playlistId) {
            let pageToken = '';
            let playlistSongs = [];
            do {
                const options = {
                    key: config.youtube_api_key,
                    playlistId,
                    pageToken,
                    part: 'snippet',
                    fields: 'nextPageToken,items(snippet(title,resourceId/videoId))',
                    maxResults: 50
                };

                const playlist = (await youtube.playlistItems.list(options)).data;

                playlistSongs = playlistSongs.concat(
                    playlist.items.filter(
                        (item) => item.snippet.title.indexOf('Deleted video') === -1
                    )
                );

                pageToken = playlist.nextPageToken ? playlist.nextPageToken : null;
            } while (pageToken);

            const songs = playlistSongs.map((song) => {
                return new Song({
                    title: song.snippet.title,
                    url: `https://www.youtube.com/watch?v=${song.snippet.resourceId.videoId}`,
                    processor: YoutubeProcessor
                });
            });

            return songs;
        }
    }

    static async getStream(song) {
        if (song.hasAllMetadata()) {
            return ytdl(song.url, {
                retries: 7,
                highWaterMark: 32768
            });
        } else {
            try {
                const info = await ytdl.getInfo(song.url);
                const songInfo = info.player_response.videoDetails;
                song.duration = util.formatTime(songInfo.lengthSeconds);
                song.thumbnail = `https://img.youtube.com/vi/${songInfo.videoId}/mqdefault.jpg`;

                return ytdl.downloadFromInfo(info, {
                    retries: 7,
                    highWaterMark: 32768
                });
            } catch (err) {
                console.log(err);
            }
        }
    }
}

module.exports = YoutubeProcessor;