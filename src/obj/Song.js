'use strict';
const ytdl = require('ytdl-core');
const tool = require('../tool.js');

/*
An object representing a song.
*/
class Song {
    constructor(title, url, duration, type) {
        this.title = title;
        this.url = url;
        this.duration = tool.formatTime(duration);
        this.type = type; //youtube, soundcloud, search
        this.startTime = null;
    }

    async getStream() {
        if (this.type === 'search') {
            return this.url;
        }
        if (this.type === 'youtube') {
            return ytdl(this.url, {
                retries: 7,
                highWaterMark: 4096
            });
        }
        if (this.type === 'youtubepl') {
            //Get duration first.
            let info = await ytdl.getInfo(this.url);
            this.duration = tool.formatTime(info.length_seconds);

            return ytdl.downloadFromInfo(info, {
                retries: 7,
                highWaterMark: 4096
            });
        }
        if (this.type === 'soundcloud') {
            return null; //need api key.
        }
    }


}

module.exports = Song;
