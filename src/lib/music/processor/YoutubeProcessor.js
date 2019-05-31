const ProviderProcessor = require('./AbstractProviderProcessor.js');
const config = require('../json/config.json')
const rp = require('request-promise');

const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3';

class YoutubeProcessor extends ProviderProcessor {
    static validSong(query) {
        return query.search(/v=(\S+?)(&|\s|$|#)/);
    }

    static validPlaylist(query) {
        return query.search(/list=(\S+?)(&|\s|$|#)/);
    }

    static processSong(query) {

    }

    static processPlaylist(query) {
        const playlistId = query.match(/list=(\S+?)(&|\s|$|#)/)[1];

        return Promise.all([getPlaylistName(), getPlaylistSongs()])
            .then(results => { return { name: results[0], songs: results[1].map(song => new Song(song)) } });

        async function getPlaylistName() {
            const options = {
                url: `${youtubeApiUrl}/playlists?id=${playlistId}&part=snippet&key=${config.youtube_api_key}`
            }
            const playlistTitle = (await rp(options).then(body => JSON.parse(body))).items[0].snippet.title;
            return playlistTitle;
        }

        async function getPlaylistSongs() {
            let pageToken = '';
            let playlistSongs = [];

            do {
                const options = {
                    url: `${youtubeApiUrl}/playlistItems?playlistId=${playlistId}${pageToken}&part=snippet&fields=nextPageToken,items(snippet(title,resourceId/videoId))&maxResults=50&key=${config.youtube_api_key}`
                }

                const playlist = await rp(options).then(body => JSON.parse(body));
                playlistSongs = playlistSongs.concat(playlist.items.filter(
                    item => item.snippet.title.search('Deleted video') == -1)
                );

                pageToken = playlist.hasOwnProperty('nextPageToken') ? playlist.nextPageToken : null;
            } while (pageToken)

            return playlistSongs;
        }
    }
}

module.exports = YoutubeProcessor;