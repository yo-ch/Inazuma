const AbstractSongProcessor = require('../../base/AbstractSongProcessor.js');
const Song = require('../Song.js');
const config = require('../../../config.json');

const { google } = require('googleapis');
const youtube = google.youtube('v3');

const YoutubeProcessor = require('./YoutubeProcessor.js');

class YoutubeSearchProcessor extends AbstractSongProcessor {
    static get songType() {
        return 'search';
    }

    static isValidRequest(query) {
        return query.startsWith('yt ');
    }

    static isValidSong(query) {
        return this.isValidRequest(query);
    }

    static isValidPlaylist() {
        return false;
    }

    static async processSong(query) {
        const options = {
            key: config.youtube_api_key,
            part: 'snippet',
            q: query.slice(query.search(/\s+/) + 1),
            maxResults: 10,
        };

        const searchResult = (await youtube.search.list(options)).data.items
            .find((result) => result.id.kind === 'youtube#video');

        return new Song({
            title: searchResult.snippet.title,
            url: `https://www.youtube.com/watch?v=${searchResult.id.videoId}`,
            thumbnail: searchResult.snippet.thumbnails.medium.url,
            processor: this
        });
    }

    static processPlaylist() {
        return null;
    }

    static getStream(song) {
        return YoutubeProcessor.getStream(song);
    }
}

module.exports = YoutubeSearchProcessor;