/*
Anime related commands and functions.
*/
'use strict';
/*eslint-disable*/
const tool = require('./util/util.js/index.js');
const aniQuery = require('./util/anilist-query.js');
const AiringSeason = require('./lib/anime/AiringSeason.js');
const MediaStatus = require('./lib/anime/AiringAnime.js').MediaStatus;
const RichEmbed = require('discord.js').RichEmbed;

const AnilistUsers = require('./util/mongooseSchema.js/index.js').AnilistUsers;
const AiringSubscribers = require('./util/mongooseSchema.js/index.js').AiringSubscribers;

const sprintf = require('sprintf-js').sprintf;

// module.exports = {
//     'anilist': retrieveAnimeData,
//     'airing': airingHandler,
//     'getAiringList': getAiringList,
//     'syncUser': syncUser,
// }

// Init airing notifications.
let currentSeason;
initAiringNotifications();

async function initAiringNotifications() {
    try {
        let currentSeasonData = (await aniQuery.getSeasonAiringData()).Page.media;
        currentSeason = new AiringSeason(currentSeasonData, onAnimeAiring);
    } catch (err) {
        console.log(err);
    }
}

async function onAnimeAiring(anime) {
    let discordUserIds = await AiringSubscribers.findOne({ animeId: anime.id }).lean().exec().discordUserIds;
    for (let userId of discordUserIds) {
        console.log(`Send notif for ${anime.name} to ${userId}`);
    }
}

/**
 * Subscribes user or guild text channel to a specific anime.
 */
function addAiringAnimeSubscriber(msg) {
    if (!currentSeason) return;

    let search = msg.content.split(/\s+/)[1];
    let anime = currentSeason.findAnime(search);
    if (anime) {
        AiringSubscribers.updateOne({ animeId: anime.id }, {
            $addToSet: {
                discordUsers: msg.author.id
            }
        }, { upsert: true },
            err => {
                if (err) {
                    msg.channel.send('Gomen there was a problem subscribing to the anime.');
                } else {
                    msg.channel.send(
                        `You have subscribed to notifications for ${anime.name}.`);
                }
            });
    }
}

/**
 * UTILITY FUNCTIONS
 */
