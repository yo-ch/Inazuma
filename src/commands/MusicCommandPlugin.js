const AbstractCommandPlugin = require('../lib/base/AbstractCommandPlugin.js');
const AbstractCommand = require('../lib/base/AbstractCommand.js');

const util = require('../util/util.js');
const config = require('../json/config.json')

const Song = require('./lib/music/Song.js');
const MusicPlayer = require('./lib/music/MusicPlayer.js');
const YoutubeProcessor = require('./lib/music/YoutubeProcessor.js');
const RichEmbed = require('discord.js').RichEmbed;

const commands = [PlayCommand];

class MusicCommandPlugin extends AbstractCommandPlugin {
    constructor() {
        super(commands);
        this.guilds = {};
    }

    get name() {
        return 'music';
    }

    get description() {
        return 'music commands';
    }

    handleMessage(msg) {
        if (!msg.guild.available) {
            return;
        }

        super.handleMessage(msg, { player: this.getGuildPlayer(msg.guild) });
    }

    getGuildPlayer(msg) {
        return this.guilds[msg.guild.id] || this.initGuildPlayer(msg);
    }

    initGuildPlayer(msg) {
        this.guilds[msg.guild.id] = new MusicPlayer(msg);
        return this.guilds[msg.guild.id];
    }
}

class PlayCommand extends AbstractCommand {
    get name() {
        return 'play';
    }

    get description() {
        return '';
    }

    async handleMessage({ msg, args, plugin }) {
        const url = args.join(' ');

        if (url) {
            try {
                let isPlaylist = false;
                let mediaResult;

                if (!url.startsWith('http')) {
                    //TODO: ADD SEARCH
                } else if (url.search('youtube.com')) {
                    if (YoutubeProcessor.validPlaylist(url)) { //Playlist.
                        mediaResult = await YoutubeProcessor.processPlaylist(url);
                        isPlaylist = true;
                    } else if (YoutubeProcessor.validSong(url)) { //Video.
                        mediaResult = await YoutubeProcessor.processVideo(url);
                    } else {
                        msg.channel.send('Invalid Youtube link!');
                    }
                }
                
                if (mediaResult) {
                    if (isPlaylist) {
                        plugin.player.queuePlaylist(mediaResult);
                    }
                }
            } catch (err) {
                //todo
            }
        }
    }
}



module.exports = MusicCommandPlugin;
