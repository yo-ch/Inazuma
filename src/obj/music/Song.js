'use strict';
const ytdl = require('ytdl-core');
const tool = require('../../util/tool.js');

/*
An object representing a song.
*/
class Song {
    constructor(title, url, type, duration = null, stream = null, thumbnail = null) {
        this.title = title;
        this.url = url;
        this.duration = tool.formatTime(duration);
        this.type = type; //youtube, soundcloud, search
        this.stream = stream;
        this.thumbnail = thumbnail;
        this.startTime = null;
    }

    async getStream() {
        if (this.type === 'search') {
            return this.stream;
        }
        if (this.type === 'youtube') {
            this.stream = ytdl(this.url, {
                retries: 7,
                highWaterMark: 32768
            });
            return this.stream;
        }
        if (this.type === 'youtubepl') {
            //Get duration first.
            let info = await ytdl.getInfo(this.url);
            this.duration = tool.formatTime(info.length_seconds);
            this.thumbnail = `https://img.youtube.com/vi/${info.video_id}/mqdefault.jpg`;

            this.stream = ytdl.downloadFromInfo(info, {
                retries: 7,
                highWaterMark: 32768
            });
            return this.stream;
        }
        if (this.type === 'soundcloud') {
            return null; //need api key.
        }
    }


}

module.exports = Song;
