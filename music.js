const ytdl = require('youtube-dl');
const request = require('request');
const config = require('./config.json');
const tool = require('./tool.js');
const ani = require('./anime.js');

var queue = [];
var musicChannel = null;
var voiceConnection = null;
var dispatch = null;

module.exports = function(client) {
    client.on('message', msg => { //Respond to music requests.
        var args = msg.content.split(' ');

        //Do not respond to messages from bots, requests that don't come from guilds and messages that don't call the music command.
        if (msg.author.bot || !msg.guild) return;
        if (args[0] !== command('music') && args[0] !== command('m')) return;

        musicChannel = client.channels.find('name', 'music');

        switch (args[1]) {
            case 'play':
            case 'p':
                return queueSong(msg);
            case 'skip':
            case 's':
                return skipSong();
            case 'queue':
            case 'q':
                return printQueue();
            case 'vol':
            case 'v':
                return setVolume(msg);
            case 'hime':
                return hime(msg);
            default:
                msg.channel.send(`Include an argument onegai, or refer to ${tool.wrap('~help music')}.`);
        }
    });

    /*
    Queues the song at the given URL.
    */
    function queueSong(msg) {
        var url = msg.content.split(' ')[1];

        ytdl.getInfo(url, (err, info) => {
            if (err || info.format_id === undefined)
                return musicChannel.send(`Invalid video, ${ani.tsunNoun()}!`);

            musicChannel.send(`Enqueued ${tool.wrap(info.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} ${tool.inaHappy}`).then(() => {
                msg.delete();
                queue.push(info);
                if (queue.length === 1) playSong(msg); //Play song since its the only one in the queue.
            }).catch(() => {});
        });
    }

    /*
    Plays the first song in the queue.
    */
    function playSong(msg) {
        if (queue.length === 0) {
            musicChannel.send('Queue complete.');

            //Leave channel after 5 minutes of inactivity
            setTimeout(() => {
                if (queue.length === 0) {
                    if (voiceConnection !== null && voiceConnection) voiceConnection.disconnect();
                    voiceConnection = null;
                    musicChannel.send(':no_entry_sign: Leaving voice channel due to inactivity.');
                }
            }, 300000);
        } else {
            //Find the voice channel to play in.
            new Promise((resolve, reject) => {
                if ((voiceConnection === null || voiceConnection.members.size === 1) && msg.member.voiceChannel)
                    msg.member.voiceChannel.join().then(connection => {
                        voiceConnection = connection;
                        musicChannel.send(`Joining **${msg.member.voiceChannel.name}**.`);
                        resolve();
                    }).catch(() => {});
                else if (voiceConnection !== null) {
                    resolve();
                } else {
                    reject();
                }
            }).then(() => {
                //Play song.
                const music = queue[0];
                musicChannel.send(`:notes: Now playing ${tool.wrap(music.title.trim())}`).then(() => {
                    dispatch = voiceConnection.playArbitraryInput(request(music.url));

                    //Wait for errors/end of song, then play the next song.
                    dispatch.on('error', error => {
                        queue.shift();
                        playSong(msg);
                    });

                    dispatch.on('end', reason => {
                        queue.shift();
                        playSong(msg);
                    });
                }).catch(() => {});
            }).catch(() => {
                msg.channel.send(`You aren\'t in a voice channel! ${tool.inaBaka}`)
            });
        }
    }

    /*
    Skips the current song.
    */
    function skipSong() {
        if (queue.length > 0) dispatch.end();
        else musicChannel.send(`There\'s nothing to skip! ${tool.inaBaka}`);
    }

    /*
    Prints the queue.
    */
    function printQueue() {
        if (queue.length > 0) {
            var queueString = '';
            for (var i = 0; i < queue.length; i++)
                queueString += `${i+1}. ${queue[i].title}\n`;
            musicChannel.send(queueString, { 'code': true });
        } else {
            musicChannel.send(`There are no songs in the queue!`);
        }
    }

    function setVolume(msg) {
        var vol = parseInt(msg.content.split(' ')[2]) / 100;
        if (vol >= 0 && vol <= 1) {
            dispatch.setVolumeLogarithmic(vol);
            musicChannel.send(`Volume set to ${tool.wrap(vol*100)}`);
        } else {
            musicChannel.send(`Use a number between 0 and 100! ${tool.inaBaka}`);
        }
    }

    /*
    Hime hime.
    */
    function hime(msg) {
        msg.content = msg.content.split(' ')[0] + ' https://www.youtube.com/watch?v=hPSQ23NRED8';
        queueSong(msg);
    }

    function command(cmd) {
        return config.prefix + cmd;
    }
}
