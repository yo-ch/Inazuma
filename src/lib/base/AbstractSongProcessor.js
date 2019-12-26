/* eslint-disable no-unused-vars */

/**
 * A song/playlist processor for a general media provider.
 */
class AbstractProviderProcessor {
    static get songType() {
        throw new Error('songType must be overwritten.');
    }

    static isValidRequest(query) {
        throw new Error('isValidRequest must be overwritten.');
    }

    static isValidSong(query) {
        throw new Error('isValidSong must be overwritten.');
    }

    static isValidPlaylist(query) {
        throw new Error('isValidPlaylist must be overwritten.');
    }

    static processSong(query) {
        throw new Error('processSong must be overwritten.');
    }

    static processPlaylist(query) {
        throw new Error('processPlaylist must be overwritten.');
    }

    static getStream(song) {
        throw new Error('getStream must be overwritten');
    }
}

module.exports = AbstractProviderProcessor;