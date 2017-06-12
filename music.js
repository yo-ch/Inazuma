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
        if (msg.author.bot || !msg.guild) return; //Do not respond to messages from bots, and requests that don't come from guilds.
        musicChannel = client.channels.find('name', 'music');

        switch (msg.content.split(' ')[0]) {
            case command('play'):
                return queueSong(msg);
            case command('skip'):
                return skipSong();
            case command('queue'):
                return printQueue(msg);
            case command('hime'):
                return hime(msg);
        }
    });

    /*
    Queues the song at the given URL.
    */
    function queueSong(msg) {
        var url = msg.content.split(' ')[1];

        ytdl.getInfo(url, (err, info) => {
            if (err || info.format_id === undefined) {
                return musicChannel.send(`Invalid video, ${ani.tsunNoun()}!`);
            }
            musicChannel.send(`Enqueued ${tool.wrap(info.title.trim())} requested by ${tool.wrap(msg.author.username + '#' + msg.author.discriminator)} <:inaHappy:301529610754195456>`).then(() => {
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
                }
            }, 300000);
        } else {
            //Find the voice channel to play in.
            new Promise((resolve, reject) => {
                if ((voiceConnection === null || voiceConnection.members.size === 1) && msg.member.voiceChannel)
                    msg.member.voiceChannel.join().then(connection => {
                        voiceConnection = connection;
                        msg.channel.send(`Joining **${msg.member.voiceChannel.name}**.`);
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
                musicChannel.send(`**Now playing** ${tool.wrap(music.title.trim())}`).then(() => {
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
                msg.channel.send('You aren\'t in a voice channel! <:inaBaka:301529550783774721>')
            });
        }
    }

    /*
    Skips the current song.
    */
    function skipSong() {
        if (queue.length > 0) dispatch.end();
        else musicChannel.send('There\'s nothing to skip! <:inaBaka:301529550783774721>');
    }

    /*
    Prints the queue.
    */
    function printQueue(msg) {
        if (queue.length > 0) {
            var queueString = '';
            for (var i = 0; i < queue.length; i++)
                queueString += `${i+1}. ${queue[i].title}\n`;
            musicChannel.send(queueString, { 'code': true });
        } else {
            musicChannel.send(`There are no songs in the queue!`);
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
