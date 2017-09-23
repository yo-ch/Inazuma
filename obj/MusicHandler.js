/*
The music player for a guild.
Handles retrieval, queuing, and streaming of Songs.
*/
class MusicHandler {
    constructor(guild) {
        this.queue = [];
        this.musicChannel = msg.guild.channels.find('name', 'music');
        this.voiceConnection = null;
        this.dispatch = null;
        this.volume = 1;
        this.status = 'offline'; //States: offline, playing, stopped
        this.inactivityTimer = 60;
    }
}
