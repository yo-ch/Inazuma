/*
Anime related commands and functions.
*/
'use strict';
const tool = require('./tool.js')

const rp = require('request-promise');
const util = require('util');
const fs = require('fs');
const RichEmbed = require('discord.js').RichEmbed;
const sprintf = require('sprintf-js').sprintf;

const stripIndent = require('strip-indent');

const writeFileAsync = util.promisify(fs.writeFile);

module.exports = {
    'anilist': retrieveAnimeData,
    'anilistChoose': anilistChoose,
    'airing': airingHandler,
    'getAiringList': getAiringList,
    'clearAiringList': clearAiringList,
    'syncList': syncList,
    'retrieveSeasonalAnime': retrieveSeasonalAnime,
    'requestMissingSchedules': requestMissingSchedules,
    'setNotificationOption': setNotificationOption,
    'passClient': passClient,
    'writeFiles': writeFiles
}

let discordClient = null;
let searchRequests = {}; //Stores search requests that have multiple results.

let subscribedAnime = require('./json/subscribedAnime.json');
let anilistUsers = require('./json/anilistUsers.json');
let seasonalAnime = require('./json/seasonalAnime.json');

/*
Display the specified anime's info, from Anilist.
*/
function retrieveAnimeData(msg) {
    let search = msg.content.split(/\s+/).slice(1).join(' ').trim();
    if (search.length >= 1) { //A search query was given.
        let query = stripIndent(
            `
            query ($search: String) {
              Page (page: 1, perPage: 15) {
                media (search: $search, type: ANIME) {
                  id
                  title{
                    romaji
                  }
                  season
                  description
                  format
                  episodes
                  averageScore
                  coverImage {
                    medium
                  }
                }
              }
            }
            `
        );
        let choice;
        if ((choice = parseInt(search))) { //Search using number from ~airing seasonal instead.
            if (seasonalAnime.hasOwnProperty(choice)) {
                search = seasonalAnime[choice];
            }
        }
        let variables = {
            'search': search
        }

        queryAnilist(query, variables).then(body => {
            let searchResults = JSON.parse(body).data.Page.media;

            if (searchResults.length == 1) { //Send results.
                let anime = searchResults[0];
                let aie = animeInfoEmbed(anime.title.romaji, anime.averageScore,
                    anime.format, anime.episodes, anime.description,
                    `https://anilist.co/anime/${anime.id}/`, anime.coverImage.medium);
                msg.channel.send(aie);
            } else if (searchResults.length >= 2) {
                //Store results to retrieve when user replies with a choice.
                searchRequests[msg.author.id] = searchResults;

                let choiceString = 'Choose a number onegai!\n\n';
                for (let i = 0; i < searchResults.length; i++)
                    choiceString +=
                    `${tool.wrap(`${i + 1} - ${searchResults[i].title.romaji}`)}\n`;
                msg.channel.send(choiceString);
            } else {
                throw {
                    message: 'No results.'
                };
            }
        }).catch(err => {
            console.log(err.message);
            msg.channel.send('Gomen, I couldn\'t find anything!');
        });
    } else {
        msg.channel.send(`Give me an anime to search for, ${tool.tsunNoun()}!`);
    }
}

/*
Replies with specified anime data after user has chosen a number.
@param {Number} choice The user's choice.
*/
function anilistChoose(msg, choice) {
    let results = searchRequests[msg.author.id];
    if (!results)
        return; //User does not have a search active.

    if (choice > 0 && choice <= results.length) {
        let anime = results[choice - 1];

        let aie = animeInfoEmbed(anime.title.romaji, anime.averageScore, anime.format, anime.episodes,
            anime.description, `https://anilist.co/anime/${anime.id}/`, anime.coverImage.medium
        );
        msg.channel.send(aie);
        delete searchRequests[msg.author.id];
    }
}

/*
Parses ~airing commands and calls the corresponding function.
*/
function airingHandler(msg) {
    let args = msg.content.split(/\s+/);

    if (args.length == 1)
        getAiringList(msg);
    else if (args[1] == 'sync')
        syncList(msg);
    else if (args[1] == 'clear')
        clearAiringList(msg);
    else if (args[1] == 'seasonal') {
        retrieveSeasonalAnime(msg);
    } else if (args[1] == 'notifications') {
        setNotificationOption(msg);
    }
}

/*
Displays user's airing list.
*/
function getAiringList(msg) {
    //Get anime that user is subscribed to, and update next episode counter if applicable.
    let subscribedAnimeIds = Object.keys(subscribedAnime);
    let airingListAnime = [];
    let unixts = tool.getUnixTime();
    for (let i = 0; i < subscribedAnimeIds.length; i++) {
        let currentAnime = subscribedAnime[subscribedAnimeIds[i]];
        updateAnimeStatuses(currentAnime, unixts);
        if (currentAnime.users.hasOwnProperty(msg.author.id)) { //If user is subscribed, add anime to list.
            airingListAnime.push(currentAnime);
        }
    }

    if (subscribedAnime.length === 0) {
        return msg.channel.send(
            `There aren't any anime in your airing list, ${tool.tsunNoun()}.`);
    }

    let info = [];
    for (let currentAnime of airingListAnime) {
        let nextEpisode = currentAnime.nextEpisode;
        let countdown = null;
        if (currentAnime.schedule) {
            if (currentAnime.schedule.length == 0) {
                countdown = Infinity; //Empty schedule means done airing. Infinity makes sense in this case.
            } else if (currentAnime.nextEpisode <= currentAnime.schedule.length) {
                countdown = currentAnime.schedule[nextEpisode - 1].airingAt - unixts;
            }
        }

        let title = currentAnime.title.length > 43 ?
            `${currentAnime.title.substring(0, 43)}...` :
            currentAnime.title; //Cut off anime title if needed.
        //Push tuple of string and airing countdown, which is used to sort by airing countdown.
        if (countdown == null)
            info.push([sprintf('%-50s [ SCHEDULE N/A ]\n', title), Infinity]);
        else if (countdown == Infinity)
            info.push([
                sprintf('%-50s [ DONE  AIRING ]\n', title),
                Infinity
            ]);
        else
            info.push([
                sprintf('%-50s Ep %-3i in %s\n', title, nextEpisode, secondsToCountdown(
                    countdown)),
                countdown
            ]);
    }

    info.sort((a, b) => { //Sorts, starting with anime closest to airing.
        return a[1] - b[1]; //compare countdowns.
    });

    let airing = `${msg.author.username}'s Airing List\n`;
    airing += '='.repeat(airing.trim().length) + '\n';
    for (let i = 0; i < info.length; i++) //Add info of each anime to airing string.
        airing += info[i][0];

    msg.channel.send(`${airing}`, {
        'code': 'md'
    });
}

/*
Syncs the anime list of the given Anilist user to the Discord user, for use with the airing list functions.
*/
function syncList(msg) {
    let args = msg.content.split(/\s+/);
    let username;
    if (args[2]) {
        username = args[2];
    } else if (anilistUsers.hasOwnProperty(msg.author.id)) {
        username = anilistUsers[msg.author.id].username;
    } else {
        return msg.channel.send(`You didn't give me a username! ${tool.inaBaka}`);
    }

    //Get user anime list.
    let query = stripIndent(
        `
        query ($userName: String) {
          MediaListCollection(userName: $userName, type:ANIME) {
            statusLists{
              media {
                id
                status
                title {
                  romaji
                  english
                }
                nextAiringEpisode {
                  episode
                }
                airingSchedule{
                  nodes{
                    airingAt
                    episode
                  }
                }
              }
            }
          }
        }
        `
    );
    let variables = {
        'userName': username
    }
    queryAnilist(query, variables).then(body => {
        //Anime user is currently watching.
        let watchingAnime = JSON.parse(body).data.MediaListCollection.statusLists.current;
        let toBeSubscribed = {}; //IDs for anime that are airing/to be aired, that we will subscribe the user to.

        //Process anime in the user's watching list.
        for (let i = 0; i < watchingAnime.length; i++) {
            let entry = watchingAnime[i];
            if ((entry.media.status == 'RELEASING' || entry.media.status ==
                    'NOT_YET_RELEASED')) {
                //Add anime that are not in the subscribedAnime list yet.
                if (!subscribedAnime.hasOwnProperty(entry.media.id)) {
                    subscribedAnime[entry.media.id] = {
                        title: entry.media.title.romaji ? entry.media.title.romaji : entry
                            .media.title.english,
                        schedule: entry.media.airingSchedule.nodes.length > 0 ? entry.media
                            .airingSchedule
                            .nodes : null,
                        nextEpisode: entry.media.nextAiringEpisode ? entry.media.nextAiringEpisode
                            .episode : 1,
                        users: {}
                    }
                }
                //User will be subscribed to this anime.
                toBeSubscribed[entry.media.id] = null;
            }
        }

        //Iterate through subscribedAnime list. Subscribe user to new anime and unsubscribe user from all other anime.
        let seasonalAnimeIds = Object.keys(subscribedAnime);
        for (let i = 0; i < seasonalAnimeIds.length; i++) {
            let id = seasonalAnimeIds[i];
            if (toBeSubscribed.hasOwnProperty(id)) {
                //Subscribe user.
                subscribedAnime[id].users[msg.author.id] = null;
            } else { //User is not/no longer subscribed to this anime.
                //Unsubscribe user.
                delete subscribedAnime[id].users[msg.author.id];
            }
        }
        updateAnilistUsers(msg.author.id, username);
        msg.channel.send(`Sync success! ${tool.inaHappy}`);
    }).catch((err) => {
        console.log(err.message);
        msg.channel.send(
            `Gomen, I couldn't sync your Anilist. Try again later. ${tool.inaError}`
        );
    });
}

/*
Clears the user's airing list.
*/
function clearAiringList(msg) {
    for (let animeId in subscribedAnime) {
        if (subscribedAnime[animeId].users.hasOwnProperty(msg.author.id)) {
            delete subscribedAnime[animeId].users[msg.author.id];
        }
    }
    msg.channel.send(`Your airing list has been cleared! ${tool.inaHappy}`);
}

/*
Display currently airing anime from Anilist.
*/
function retrieveSeasonalAnime(msg) {
    let season = getCurrentSeason();
    let query = stripIndent(
        `
        query ($season: MediaSeason){
          Page (page: 1, perPage: 50) {
            media (type: ANIME, format: TV, sort: TITLE_ROMAJI, season: $season, seasonYear: 2017) {
              id
              title{
                romaji
              }
              format
            }
          }
        }
        `
    );

    let variables = {
        'season': season.season
    }

    queryAnilist(query, variables).then(body => {
        let data = JSON.parse(body).data.Page.media;
        let msgResponse = `[   ${season.season} ${season.year}    ]\n`;
        msgResponse += '='.repeat(msgResponse.trim().length) + '\n';
        for (let i = 0; i < data.length; i++) {
            msgResponse += sprintf('%03s %1s\n', (i + 1).toString() + '.', data[i]
                .title
                .romaji);
            seasonalAnime[i + 1] = data[i].title.romaji;
        }
        msg.channel.send(msgResponse, {
            code: 'md'
        });
        msg.channel.send(tool.wrap(
            'Get more info on an anime using ~anilist <name|number>.'));
    }).catch(err => console.log(err.message));
}

/*
NOTIFICATION/AIRING LIST FUNCTIONS
*/

/*
Updates the status of all anime in subscribedAnime.
Removes anime that have no more subscribers and is done airing.
*/
function updateAnimeStatuses() {
    let unixts = tool.getUnixTime();

    for (let animeId in subscribedAnime) {
        let currentAnime = subscribedAnime[animeId];
        if (currentAnime.schedule && currentAnime.schedule.length > 0) {
            while (currentAnime.nextEpisode <= currentAnime.schedule.length && unixts >
                currentAnime.schedule[currentAnime.nextEpisode - 1].airingAt
            ) {
                notifyAnimeAired(currentAnime, currentAnime.nextEpisode);
                currentAnime.nextEpisode++;
            }
            if (currentAnime.nextEpisode > currentAnime.schedule.length) {
                //Get next batch of airing schedule.
                requestAiringData(parseInt(animeId));
            }
        }

        if (currentAnime.schedule && currentAnime.schedule.length == 0 && Object.keys(currentAnime.users)
            .length == 0) {
            delete subscribedAnime[animeId];
        }
    }
}

/*
Notifies subscribed users that an anime has aired if they have notifications on.
@param {Object} airedAnime The anime that has aired.
@param {Number} episode The episode number.
*/
async function notifyAnimeAired(airedAnime, episode) {
    for (let userId in airedAnime.users) {
        if (anilistUsers.hasOwnProperty(userId) && anilistUsers[userId].notifications == true) { //Notifications on.
            try {
                let user = await discordClient.fetchUser(userId);
                let dm = await user.createDM();
                dm.send(`${tool.wrap(airedAnime.title)} **Episode ${episode}** has aired!`);
            } catch (err) {
                console.log(err.message);
            }
        }
    }
}

/*
Sets the notification option of the user.
*/
function setNotificationOption(msg) {
    let args = msg.content.split(/\s+/);
    if (anilistUsers.hasOwnProperty(msg.author.id)) {
        let on;
        if (args[2] && args[2] == 'on' || args[2] == 'off') {
            on = args[2];
        } else {
            return;
        }
        anilistUsers[msg.author.id].notifications = on == 'on' ? true : false;
        msg.channel.send(`Notifications are now ${tool.wrap(on)}! ${tool.inaHappy}`);
    }
}

/*
UTILITY FUNCTIONS
*/

/*
Periodically write stored data to files, and check if any anime have aired. (15 mins)
*/
setInterval(function periodicalFuncts() {
    writeFiles();
    updateAnimeStatuses();
}, 900000);
setTimeout(updateAnimeStatuses, 5000);

/*
Send request to Anilist api with provided query and variables.
@param {String} query The GraphQL query.
@param {Object} variables The variables for the GraphQL query.
*/
function queryAnilist(query, variables) {
    let options = {
        method: 'POST',
        url: `https://graphql.anilist.co`,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    }
    return rp(options);
}

/*
Requests airing schedules for anime missing them.
*/
function requestMissingSchedules() {
    for (let animeId in subscribedAnime) {
        if (subscribedAnime[animeId].schedule != null) break;
        requestAiringData(parseInt(animeId));
    }
}

/*
Requests the latest airing data (25 eps) for an anime, and updates the anime entry accordingly.
*/
function requestAiringData(animeId) {
    let anime = subscribedAnime[animeId];

    let query = stripIndent(
        `
      query ($id: Int, $page: Int){
        Media(id: $id, type: ANIME){
          id
          status
          nextAiringEpisode{
            episode
          }
          airingSchedule (page: $page){
            nodes{
              airingAt
              episode
            }
          }
        }
      }
      `
    );
    let variables = {
        'id': animeId,
        'page': Math.floor(subscribedAnime[animeId].nextEpisode / 25) + 1
    }

    queryAnilist(query, variables).then(body => {
        let animeSchedule = JSON.parse(body).data.Media;

        if (animeSchedule.status != 'RELEASING' && animeSchedule.status !=
            'NOT_YET_RELEASED') {
            anime.schedule = []; //Empty schedule to signify airing completion.
        } else if (animeSchedule.airingSchedule.nodes.length > 0) { //Schedule available and anime still airing.
            let tempSchedule = anime.schedule == null ? [] : anime.schedule;
            anime.schedule = tempSchedule.concat(animeSchedule.airingSchedule.nodes);
            anime.nextEpisode = animeSchedule.nextAiringEpisode ?
                animeSchedule.nextAiringEpisode.episode :
                1;
        } else if (animeSchedule.airingSchedule.nodes.length == 0) {
            anime.schedule = null;
        } else {
            return;
        }
        console.log(`Updated schedule of an anime! ID: ${animeSchedule.id}`);
    }).catch(err => console.log(err.message));
}

/*
Updates the anilistUsers obj with a user's information.
@param {Number} userId The user's Discord id.
@param {String} username The user's Anilist name.
*/
function updateAnilistUsers(userId, username) {
    if (!anilistUsers.hasOwnProperty(userId) || anilistUsers[userId] !=
        username) {
        anilistUsers[userId] = {
            username: username,
            notifications: true
        }
    }
}
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
    days = (days == 0) ?
        '' :
        days + 'd ';
    hours = (hours == 0) ?
        '' :
        hours + 'h';

    if (days == '' && hours == '') {
        return `${Math.ceil(seconds / 60)}m`;
    } else {
        return `${days}${hours}`;
    }
}

/*
Returns the current anime season.
@return {Object} An object with a season and year property.
*/
function getCurrentSeason() {
    let date = new Date();
    let month = date.getMonth();
    let year = date.getFullYear();

    let season;
    if (0 <= month && month <= 2)
        season = 'WINTER';
    else if (3 <= month && month <= 5)
        season = 'SPRING';
    else if (6 <= month && month <= 8)
        season = 'SUMMER';
    else if (9 <= month && month <= 11)
        season = 'FALL';

    return {
        season: season,
        year: year
    };
}

/*
Write data in memory to JSON files.
*/
function writeFiles() {
    let wfPromises = Promise.all([
        writeFileAsync('./json/subscribedAnime.json', JSON.stringify(subscribedAnime)),
        writeFileAsync('./json/anilistUsers.json', JSON.stringify(anilistUsers)),
        writeFileAsync('./json/seasonalAnime.json', JSON.stringify(seasonalAnime))
    ]);
    wfPromises.catch(err => console.log('Error saving JSON files: ' + err));
    return wfPromises;
}

/*
Receive Discord client instance.
@param {Object} client The Discord client.
*/
function passClient(client) {
    discordClient = client;
}
