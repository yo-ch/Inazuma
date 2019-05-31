/* eslint-disable no-unused-vars */

/**
 * A song/playlist processor for a general media provider.
 */
class AbstractProviderProcessor {
    static validSong(query) {
        throw new Error('validSong must be overwritten.');
    }

    static validPlaylist(query) {
        throw new Error('validPlaylist must be overwritten.');
    }

    static processSong(query) {
        throw new Error('processSong must be overwritten.');
    }

    static processPlaylist(query) {
        throw new Error('processPlaylist must be overwritten.');
    }
}

module.exports = ProviderProcessor;