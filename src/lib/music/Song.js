'use strict';
const ytdl = require('ytdl-core');
const util = require('../../util/util.js');

/**
 * Stores song metadata for use with the MusicPlayer.
 */
class Song {
    constructor({ title, url, duration, thumbnail, processor }) {
        this.title = title;
        this.url = url;
        this.duration = util.formatTime(duration);
        this.thumbnail = thumbnail;
        this.startTime = null;
        this.processor = processor;
    }

    /**
     * Returns whether or not the song has all metadata needed for display.
     */
    hasAllMetadata() {
        return this.title && this.url && this.duration && this.thumbnail;
    }
}

module.exports = Song;
