'use strict';
const config = require('./config.json');
const tool = require('./tool.js')
const rp = require('request-promise');
const stripIndent = require('strip-indent');
const sprintf = require('sprintf-js').sprintf;
const fs = require('fs');

module.exports = {
    'retrieveAnimeData': retrieveAnimeData,
    'anilistChoose': anilistChoose,
    'retrieveAiringData': retrieveAiringData,
    'clearAiringList': clearAiringList,
    'syncList': syncList,
    'retrieveSeasonalAnime': retrieveSeasonalAnime
}

var searchRequests = {}; //Stores search requests that have multiple results.

/*
Common Params:
@param Object msg - The message that called the command.
*/

/*
Retrieve the specified anime from Anilist.
*/
function retrieveAnimeData(msg) {
    var search = msg.content.split(/\s+/).slice(1).join(' ').trim();
    if (search.length >= 1) { //A search query was given.
        var query = stripIndent(
            `
            query ($search: String) {
              Page (page: 1, perPage: 15) {
                media (search: $search, type: ANIME) {
                  id
                  title{
                    romaji
                  }
                  description
                  format
                  episodes
                  averageScore
                }
              }
            }
            `
        );
        var choice;
        if (choice = parseInt(search)) {
            var seasonalAnimeNames = JSON.parse(fs.readFileSync('seasonalAnime.json'));
            if (seasonalAnimeNames.hasOwnProperty(search)) {
                search = seasonalAnimeNames[search];
            }
        }
        var variables = {
            'search': search
        }

        var options = {
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

        rp(options).then(body => {
            var searchResults = JSON.parse(body).data.Page.media;

            if (searchResults.length == 1) { //Send results.
                var anime = searchResults[0];
                var ais = animeInfoString(anime.title.romaji, anime.averageScore,
                    anime.format, anime.episodes, anime.description,
                    `https://anilist.co/anime/${anime.id}/`);
                msg.channel.send(ais);
            } else if (searchResults.length >= 2) {
                //Store results to retrieve when user replies with a choice.
                searchRequests[msg.author.id] = searchResults;

                var choiceString = 'Choose a number onegai!\n\n';
                for (var i = 0; i < searchResults.length; i++)
                    choiceString +=
                    `${tool.wrap(`${i + 1} - ${searchResults[i].title.romaji}`)}\n`;
                msg.channel.send(choiceString);
            }
        }).catch(err => {
            console.log(err);
            msg.channel.send('Gomen, I couldn\'t find anything!');
        });
    } else {
        msg.channel.send(`Give me an anime to search for, ${tool.tsunNoun()}!`);
    }
}

/*
Syncs the anime list of the given Anilist user to the Discord user, for use with the airing list functions.
*/
function syncList(msg) {
    var args = msg.content.split(/\s+/);
    var anilistUsers = JSON.parse(fs.readFileSync('anilistUsers.json'));
    var username;
    if (args[2]) {
        username = args[2];
    } else if (anilistUsers.hasOwnProperty(msg.author.id)) {
        username = anilistUsers[msg.author.id];
    } else {
        return msg.channel.send(`You didn't give me a username! ${tool.inaBaka}`);
    }

    //Get user anime list.
    var query = stripIndent(
        `
        query ($userName: String) {
          MediaListCollection(userName: $userName, type:ANIME) {
            statusLists{
              media {
                id
                status
                title {
                  romaji
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
    var variables = {
        'userName': username
    }
    queryAnilist(query, variables).then(body => {
        //Anime user is currently watching.
        var watchingAnime = JSON.parse(body).data.MediaListCollection.statusLists.current;
        var toBeSubscribed = {}; //IDs for anime that are airing/to be aired, that we will subscribe the user to.

        var subscribedAnimeList = JSON.parse(fs.readFileSync('subscribedAnime.json'));
        //Process anime in the user's watching list.
        for (let i = 0; i < watchingAnime.length; i++) {
            let entry = watchingAnime[i];
            if ((entry.media.status == 'RELEASING' || entry.media.status ==
                    'NOT_YET_RELEASED')) {
                //Add anime that are not in the subscribedAnime list yet.
                if (!subscribedAnimeList.hasOwnProperty(entry.media.id)) {
                    subscribedAnimeList[entry.media.id] = {
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
        var seasonalAnimeIds = Object.keys(subscribedAnimeList);
        for (let i = 0; i < seasonalAnimeIds.length; i++) {
            let id = seasonalAnimeIds[i];
            if (toBeSubscribed.hasOwnProperty(id)) {
                //Subscribe user.
                subscribedAnimeList[id].users[msg.author.id] = null;
            } else { //User is not/no longer subscribed to this anime.
                //Unsubscribe user.
                delete subscribedAnimeList[id].users[msg.author.id];
            }
        }

        fs.writeFile('subscribedAnime.json', JSON.stringify(subscribedAnimeList));

        //Add/modify Anilist username of the message author.
        if (!anilistUsers.hasOwnProperty(msg.author.id) || anilistUsers[msg.author.id] !=
            username) {
            anilistUsers[msg.author.id] = username;
            fs.writeFile('anilistUsers.json', JSON.stringify(anilistUsers));
        }
        msg.channel.send(`Sync success! ${tool.inaHappy}`);
    }).catch((err) => {
        console.log(err.message);
        msg.channel.send(
            `Gomen, I couldn't sync your Anilist. Try again later. ${tool.inaError}`
        );
    });
}

function queryAnilist(query, variables) {
    return new Promise((resolve, reject) => {
        var options = {
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
        rp(options).then(body => resolve(body)).catch(reject);
    });
}

/*
Replies with specified anime data after user has chosen a number.

@param Number choice - The user's choice.
*/
function anilistChoose(msg, choice) {
    var results = searchRequests[msg.author.id];
    if (!results)
        return; //User does not have a search active.

    if (choice > 0 && choice <= results.length) {
        var anime = results[choice - 1];

        var ais = animeInfoString(anime.title.romaji, anime.averageScore, anime.format, anime.episodes,
            anime.description, `https://anilist.co/anime/${anime.id}/`);
        msg.channel.send(ais);
        delete searchRequests[msg.author.id];
    }
}

/*
Retrieve all currently airing anime from Anilist.
*/
function retrieveSeasonalAnime(msg) {
    var season = getCurrentSeason();
    var query = stripIndent(
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

    var variables = {
        'season': season.season
    }

    var options = {
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

    rp(options).then(body => {
        var seasonalAnime = JSON.parse(body).data.Page.media;
        var response = `[   ${season.season} ${season.year}    ]\n`;
        var seasonalAnimeListNew = {};
        response += '='.repeat(response.trim().length) + '\n';
        for (let i = 0; i < seasonalAnime.length; i++) {
            response += sprintf('%03s %1s\n', (i + 1).toString() + '.', seasonalAnime[i]
                .title
                .romaji);
            seasonalAnimeListNew[i + 1] = seasonalAnime[i].title.romaji;
        }
        msg.channel.send(response, {
            code: 'md'
        });
        msg.channel.send(tool.wrap(
            'Get more info on an anime using ~anilist <name|number>.'));

        //Update seasonalAnime list if applicable.
        seasonalAnimeListNew = JSON.stringify(seasonalAnimeListNew);
        var seasonalAnimeList = fs.readFileSync('seasonalAnime.json');
        if (seasonalAnimeList != seasonalAnimeListNew) {
            fs.writeFile('seasonalAnime.json', seasonalAnimeListNew);
        }
    }).catch(err => console.log(err.message));
}

/*
Displays airing data of anime in the user's airing list.
*/
function retrieveAiringData(msg) {
    var subscribedAnime = JSON.parse(fs.readFileSync('subscribedAnime.json'));

    //Get anime that user is subscribed to, and update next episode counter if applicable.
    var subscribedAnimeIds = Object.keys(subscribedAnime);
    var airingListAnime = [];
    var unixts = Math.round((new Date()).getTime() / 1000);
    for (let i = 0; i < subscribedAnimeIds.length; i++) {
        let currentAnime = subscribedAnime[subscribedAnimeIds[i]];

        if (currentAnime.schedule) {
            while (unixts > currentAnime.schedule[currentAnime.nextEpisode - 1].airingAt &&
                currentAnime.nextEpisode < currentAnime.schedule.length) {
                currentAnime.nextEpisode++;
            }
        }

        if (currentAnime.users.hasOwnProperty(msg.author.id)) {
            airingListAnime.push(currentAnime);
        }
    }

    if (subscribedAnime.length === 0) {
        return msg.channel.send(
            `There aren\'t any anime in your airing list, ${tool.tsunNoun()}.`);
    }

    var info = [];
    for (let currentAnime of airingListAnime) {
        let nextEpisode = currentAnime.nextEpisode;
        let countdown = currentAnime.schedule ? currentAnime.schedule[nextEpisode - 1].airingAt -
            unixts : null;

        var title = currentAnime.title.length > 43 ?
            `${currentAnime.title.substring(0, 43)}...` :
            currentAnime.title; //Cut off anime title if needed.
        //Push tuple of string and airing countdown, which is used to sort by airing countdown.
        if (countdown == null)
            info.push([sprintf('%-50s [ SCHEDULE N/A ]\n', title), Infinity]);
        else if (currentAnime.schedule.length < nextEpisode)
            info.push([
                sprintf('%-50s [  DONE AIRING  ]\n', title),
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

    var airing = `${msg.author.username}'s Airing List\n`;
    airing += "=".repeat(airing.trim().length) + '\n';
    for (let i = 0; i < info.length; i++) //Add info to airing string.
        airing += info[i][0];

    var airingListPromise = msg.channel.send(`${airing}`, {
        'code': 'md'
    });

    fs.writeFile('subscribedAnime.json', JSON.stringify(subscribedAnime)); //Update file.

    setTimeout(() => { //Delete airing message after 5 minutes.
        airingListPromise.then(airingMsg => {
            msg.delete();
            airingMsg.delete();
        });
    }, 300000);
}

/*
Clears the user's airing list.
*/
function clearAiringList(msg) {
    var subscribedAnime = JSON.parse(fs.readFileSync('subscribedAnime.json'));
    idJSON[msg.author.id] = [];
    fs.writeFile('airing_anime.json', JSON.stringify(idJSON));
    msg.channel.send('Your airing list has been cleared!');
}

/*
UTILITY FUNCTIONS
*/

/*
Formats the given anime information.

@params String
*/
function animeInfoString(name, score, type, episodes, synopsis, url) {
    if (!episodes) episodes = 'N/A';
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

    var syn = synopsis.replace(/<br>\\n|<br>/g, '\n');
    syn = syn.replace(/<i>|<\/i>/g, '*');
    syn = syn.slice(0, syn.indexOf('(Source:')).trim(); //Remove source information.
    return `**${name}** (${url})\n**Score:** ${score}\n**Type:** ${type}\n**Episodes:** ${episodes}\n\n${syn}\n\n`;
}

/*
Converts a countdown in seconds to days/hours/minutes.
*/
function secondsToCountdown(seconds) {
    var days = Math.floor(seconds / 86400);
    var hours = Math.floor((seconds % 86400) / 3600);
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

function getCurrentSeason(seconds) {
    var date = new Date();

    var month = date.getMonth();
    var year = date.getFullYear();

    switch (month) {
        case 0:
        case 1:
        case 2:
            return {
                season: 'WINTER',
                year: year
            };
        case 3:
        case 4:
        case 5:
            return {
                season: 'SPRING',
                year: year
            };
        case 6:
        case 7:
        case 8:
            return {
                season: 'SUMMER',
                year: year
            };
        case 9:
        case 10:
        case 11:
            return {
                season: 'FALL',
                year: year
            };
    }
}
