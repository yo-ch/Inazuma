/*
Anime related commands and functions.
*/
'use strict';
const tool = require('./util/tool.js');
const aniQuery = require('./util/anilist-query.js');
const AiringSeason = require('./obj/anime/AiringSeason.js');
const MediaStatus = require('./obj/Anime/AiringAnime.js').MediaStatus;
const RichEmbed = require('discord.js').RichEmbed;

const rp = require('request-promise');
const sprintf = require('sprintf-js').sprintf;
const mongoose = require('mongoose');

//Schema for Anilist users.
let anilistUsersSchema = new mongoose.Schema({ discordUserId: Number, anilistUserId: Number });
let AnilistUsers = mongoose.model('anilistUser', anilistUsersSchema);

module.exports = {
    'anilist': retrieveAnimeData,
    'airing': airingHandler,
    'getAiringList': getAiringList,
    'syncUser': syncUser,
}

/*
Display the specified anime's info, from Anilist.
*/
async function retrieveAnimeData(msg) {
    let search = msg.content.split(/\s+/).slice(1).join(' ').trim();
    try {
        if (search) { //A search query was given.
            let queryResult = await aniQuery.getAnimeInfo(search)
            let searchResults = queryResult.Page.media;
            if (searchResults.length === 1) { //Send results.
                let anime = searchResults[0];
                let aie = animeInfoEmbed(anime.title.romaji, anime.averageScore,
                    anime.format, anime.episodes, anime.description,
                    `https://anilist.co/anime/${anime.id}/`, anime.coverImage.medium);
                msg.channel.send(aie);
            } else if (searchResults.length >= 2) {
                let choiceString = 'Choose a number onegai!\n\n';
                for (let i = 0; i < searchResults.length; i++) {
                    choiceString += `${tool.wrap(`${i + 1} - ${searchResults[i].title.romaji}`)}\n`;
                }
                msg.channel.send(choiceString);

                //Wait for response.
                let filter = m => parseInt(m.content) > 0 && parseInt(m.content) <=
                    searchResults.length;
                msg.channel.createMessageCollector(filter, {
                    time: 20000,
                    maxMatches: 1
                }).on('collect', m => {
                    let anime = searchResults[parseInt(m.content) - 1];
                    let aie = animeInfoEmbed(anime.title.romaji, anime.averageScore,
                        anime.format, anime.episodes,
                        anime.description,
                        `https://anilist.co/anime/${anime.id}/`, anime.coverImage
                        .medium
                    );
                    msg.channel.send(aie);
                });
            } else {
                throw {
                    message: 'No results.'
                };
            }
        } else {
            msg.channel.send(`Give me an anime to search for, ${tool.tsunNoun()}!`);
        }
    } catch (err) {
        console.log(err);
        msg.channel.send('Gomen, I couldn\'t find anything!');
    }
}

/**
 * Parses ~airing commands and calls the corresponding function.
 */
function airingHandler(msg) {
    let args = msg.content.split(/\s+/);

    if (args.length === 1) {
        getAiringList(msg);
    } else if (args[1] === 'sync') {
        syncUser(msg);
    }
}

/**
 * Displays user's airing list.
 */
async function getAiringList(msg) {
    try {
        let discordUserId = msg.author.id;
        let queryResult = await AnilistUsers.findOne({ discordUserId }, { anilistUserId: 1 })
            .lean().exec();
        let anilistUserId = queryResult.anilistUserId;

        if (anilistUserId) {
            let data = await aniQuery.getUserAiringList(anilistUserId);
            let watchingList = data.MediaListCollection.statusLists.current;

            let airingList = watchingList
                .filter(anime => anime.media.status === MediaStatus.RELEASING ||
                    anime.media.status === MediaStatus.NOT_YET_RELEASED)
                .map(anime => {
                    if (anime.media.nextAiringEpisode.airingAt === null) {
                        anime.media.nextAiringEpisode.airingAt = Infinity;
                    }
                    if (anime.media.title.romaji.length > 43) {
                        anime.media.title.romaji = anime.media.title.romaji.substring(0, 43) +
                            '...';
                    }
                    return anime;
                })
                .sort((a, b) => {
                    a.media.nextAiringEpisode.airingAt - b.media.nextAiringEpisode.airingAt;
                });

            let listResponse = `#${msg.author.username}'s Airing List\n` + airingList.reduce(
                airingMessageReducer, '');
            msg.channel.send(listResponse, { code: 'md' });
        }
    } catch (err) {
        console.log(err);
        msg.channel.send('Gomen, there was a problem retrieving your airing list.');
    }

    function airingMessageReducer(acc, currAnime) {
        let appendString = currAnime.media.nextAiringEpisode.airingAt === Infinity ?
            sprintf('%-50s [ SCHEDULE N/A ]', currAnime.media.title.romaji) :
            sprintf('%-50s  Ep %-3i in %s',
                currAnime.media.title.romaji,
                currAnime.media.nextAiringEpisode.episode,
                secondsToCountdown(currAnime.media.nextAiringEpisode.airingAt - tool.getUnixTime())
            );
        return acc + appendString + '\n';
    }
}

/**
 * Syncs the Anilist user to the Discord user, for use with the airing list functions.
 */
async function syncUser(msg) {
    let args = msg.content.split(/\s+/);
    let anilistUsername = args[2];
    if (!anilistUsername) {
        return msg.channel.send(`You didn't give me a username, ${tool.tsunNoun()}`);
    }

    // Get Anilist Id.
    try {
        let data = await aniQuery.getAnilistUserId(anilistUsername);
        let anilistUserId = data.User.id;
        //Save Anilist Id to db.
        AnilistUsers.updateOne({ discordUserId: msg.author.id }, { $set: { anilistUserId: anilistUserId } }, { upsert: true },
            err => {
                if (err) {
                    msg.channel.send('Gomen, there was a problem syncing to Anilist.');
                    console.log(err);
                } else {
                    msg.channel.send('Synced to Anilist successfully!');
                }
            });
    } catch (err) {
        console.log(err.message);
        let error = err.error ? JSON.parse(err.error).data : '';
        if (error.length && error === 'Not Found.') {
            msg.channel.send(
                `Your username is invalid! Please give a valid Anilist username.`);
        } else {
            msg.channel.send(`Gomen, there was a problem syncing your Anilist.`);
        }
    }
}

/*
UTILITY FUNCTIONS
*/

/*
Formats the given anime information into an embed.
@params {Strings} params Self explanatory.
*/
function animeInfoEmbed(name, score, type, episodes, synopsis, url, image) {
    let embed = new RichEmbed();

    if (!episodes) episodes = 'N/A';
    if (!score) score = 'N/A';
    const formatType = {
        'TV': 'TV',
        'TV_SHORT': 'TV Short',
        'MOVIE': 'Movie',
        'SPECIAL': 'Special',
        'OVA': 'OVA',
        'ONA': 'ONA',
        'MUSIC': 'Music'
    }
    type = formatType[type] ? formatType[type] : type;
    synopsis = synopsis.replace(/<br>\\n|<br>/g, '\n'); //Remove <b> tags.
    synopsis = synopsis.replace(/<i>|<\/i>/g, '*'); //Remove <i> tags.
    synopsis = synopsis.slice(0, synopsis.indexOf('(Source:')).trim(); //Remove source information.

    embed.setTitle(name);
    embed.setImage(image);
    embed.addField('Type:', tool.wrap(type), true);
    embed.addField('Score:', tool.wrap(score), true);
    embed.addField('Episodes:', tool.wrap(episodes), true);
    embed.addField('Synopsis:', synopsis, false);
    embed.setURL(url);
    embed.setColor('BLUE');
    embed.setFooter('Powered by Anilist');

    return embed;
}

/*
Converts a countdown in seconds to days/hours/minutes.
@param {Number} seconds The number of seconds.
*/
function secondsToCountdown(seconds) {
    let days = Math.floor(seconds / 86400);
    let hours = Math.floor((seconds % 86400) / 3600);
    days = (days === 0) ?
        '' :
        days + 'd ';
    hours = (hours === 0) ?
        '' :
        hours + 'h';

    if (days === '' && hours === '') {
        return `${Math.ceil(seconds / 60)}m`;
    } else {
        return `${days}${hours}`;
    }
}
