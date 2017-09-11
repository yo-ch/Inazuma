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
    'addAiringAnime': addAiringAnime,
    'removeAiringAnime': removeAiringAnime,
    'clearAiringList': clearAiringList,
    'syncList': syncList

}

var searchRequests = {}; //Stores search requests that have multiple results.
var anilistToken = ''; //API token.
var tokenTimer = 0; //API expiry timer.

/*
Common Params:
@param Object msg - The message that called the command.
*/

/*
Retrieve the specified anime from Anilist.
*/
function retrieveAnimeData(msg) {
    var search = msg.content.split(/\s+/).slice(1).join(' ');
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

        var seasonalAnimeList = JSON.parse(fs.readFileSync('seasonalAnime.json'));
        //Add anime that are not in the subscribedAnime list yet.
        for (let i = 0; i < watchingAnime.length; i++) {
            let entry = watchingAnime[i];
            if ((entry.media.status == 'RELEASING' || entry.media.status ==
                    'NOT_YET_RELEASED')) {
                if (!seasonalAnimeList.hasOwnProperty(entry.media.id)) {
                    seasonalAnimeList[entry.media.id] = {
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

        //Iterate through subscribedAnime list. Subscribe user to new anime and unsubscribe user from anime they are no longer watching.
        var seasonalAnimeIds = Object.keys(seasonalAnimeList);
        for (let i = 0; i < seasonalAnimeIds.length; i++) {
            let id = seasonalAnimeIds[i];
            if (toBeSubscribed.hasOwnProperty(id)) {
                //Subscribe user.
                seasonalAnimeList[id].users[msg.author.id] = null;
            } else { //User is not/no longer subscribed to this anime.
                //Unsubscribe user.
                delete seasonalAnimeList[id].users[msg.author.id];
            }
        }

        fs.writeFile('seasonalAnime.json', JSON.stringify(seasonalAnimeList));

        //Add/modify Anilist username of the message author.
        if (!anilistUsers.hasOwnProperty(msg.author.id) || anilistUsers[msg.author.id] != username) {
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
function retrieveAiringAnime(msg) {
    var query = stripIndent(
        `
        query {
          Page (page: 1, perPage: 50) {
            media (type: ANIME, format: TV, sort: TITLE_ROMAJI, season: SUMMER, seasonYear: 2017) {
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

    var options = {
        method: 'POST',
        url: `https://graphql.anilist.co`,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            query: query
        })
    }

    rp(options).then(body => {
        var seasonalAnime = JSON.parse(body).data.Page.media;
        var response = '#   SUMMER 2017   #\n';
        for (let i = 0; i < seasonalAnime.length; i++) {
            response += sprintf('%03s %1s\n', (i + 1).toString() + '.', seasonalAnime[i]
                .title
                .romaji);
        }
        msg.channel.send(response, {
            code: 'md'
        });
        msg.channel.send(tool.wrap(
                'Add anime to your airing list using ~airing a <number[,...]>.') +
            '\n' +
            tool.wrap(
                'Get more info on an anime using ~anilist <name|number>.'));
    }).catch();
}

/*
Displays airing data of anime in the user's airing list.
*/
function retrieveAiringData(msg) {
    var currentAnime,
        seasonalAnime = JSON.parse(fs.readFileSync('seasonalAnime.json'));

    //Get anime that user is subscribed to, and update next episode counter if applicable.
    var seasonalAnimeIds = Object.keys(seasonalAnime);
    var subscribedAnime = [];
    var unixts = Math.round((new Date()).getTime() / 1000);
    for (let i = 0; i < seasonalAnimeIds.length; i++) {
        let currentAnime = seasonalAnime[seasonalAnimeIds[i]];

        if (currentAnime.schedule) {
            while (unixts > currentAnime.schedule[currentAnime.nextEpisode - 1].airingAt &&
                currentAnime.nextEpisode < currentAnime.schedule.length) {
                currentAnime.nextEpisode++;
            }
        }

        if (currentAnime.users.hasOwnProperty(msg.author.id)) {
            subscribedAnime.push(currentAnime);
        }
    }

    if (subscribedAnime.length === 0) {
        return msg.channel.send(
            `There aren\'t any anime in your airing list, ${tool.tsunNoun()}.`);
    }

    var info = [];
    for (currentAnime of subscribedAnime) {
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

    fs.writeFile('seasonalAnime.json', JSON.stringify(seasonalAnime)); //Update file.

    setTimeout(() => { //Delete airing message after 5 minutes.
        airingListPromise.then(airingMsg => {
            msg.delete();
            airingMsg.delete();
        });
    }, 300000);
}

/*
Adds anime to the airing list of the user using the anime's URLs.
*/
function addAiringAnime(msg) {
    var animeToAdd = msg.content.slice(config.prefix.length + 10).split(',');
    if (!animeToAdd || animeToAdd.length == 0)

        var ids = [];
    for (var i = 0; i < animeToAdd.length; i++) {
        var id = animeToAdd[i].match(/\/(\d+)\//);
        if (!id) { //No matches in regex.
            msg.channel.send(`Invalid link, ${tool.tsunNoun()}!`);
            continue;
        }
        ids.push(addAiringInner(msg, id[1]));
    }
    if (ids.length == 0)
        return;

    var animeJSON = JSON.parse(fs.readFileSync('airing_anime.json'));
    if (!animeJSON[msg.author.id])
        animeJSON[msg.author.id] = [];
    Promise.all(ids).then(airingData => { //Wait for all anime to finish processing to write to file.
        var added = 0;
        for (var i = 0; i < airingData.length; i++) {
            if (airingData[i] == 'err')
                continue;
            animeJSON[msg.author.id].push(airingData[i]);
            added++;
        }
        if (!added)
            throw 'no anime added';
        fs.writeFile('airing_anime.json', JSON.stringify(animeJSON), () => {
            msg.channel.send(
                `Finished adding anime to your list. ${tool.inaHappy}`
            );
        });
    }).catch(error => {
        console.log(error);
        msg.channel.send(
            `${tool.inaError} Gomen, I couldn't add your anime to the list.`
        );
    });
}

/*
Gets airing information for anime by their IDs on Anilist.

@param String id - The id of the anime.
@return Promise - resolved if info was succesfully retrieved, and reject if not.
*/
function addAiringInner(msg, id, seasonalAnimeList) {
    return new Promise((resolve, reject) => {
        var countdowns = []; //Required airing data.
        var title = '';
        var nextEp = null;
        var totalEps;

        var options = {
            url: `https://anilist.co/api/anime/${id}?access_token=${anilistToken}`
        }

        rp(options).then(body => { //Retrieve title of anime.
            var results = JSON.parse(body);

            title = results.title_romaji.trim();
            totalEps = results.total_episodes;

            if (results.airing_status != 'currently airing') {
                msg.channel.send(
                    `**${title}** isn't currently airing, ${tool.tsunNoun()}!`
                );
                return resolve('err');
            }

            options = {
                url: `https://anilist.co/api/anime/${id}/airing?access_token=${anilistToken}`
            }

            rp(options).then(body => { //Retrieve airing times for each episode of the anime.
                var results = JSON.parse(body);
                var length = Object.keys(results).length;

                if (length == 0) {
                    msg.channel.send(
                        `Gomen, airing times for **${title}** are not available yet.`
                    );
                    return resolve('err');
                }

                for (var i = 0; i < length; i++) {
                    countdowns.push(results[`${i + 1}`]);
                }

                var unixts = Math.round(new Date().getTime() / 1000);
                for (var i = 0; i < countdowns.length; i++) { //Get next ep number.
                    if (countdowns[i] > unixts) {
                        nextEp = i + 1; //Add 1 because we started at 'ep 0' technically.
                        break;
                    }
                }
                if (!nextEp)
                    nextEp = totalEps + 1; //Anime done airing, but status wasn't updated.

                msg.channel.send(
                    `**${title}** has been added to your airing list!`
                );

                resolve({
                    'title': title,
                    'countdowns': countdowns,
                    'totalEps': totalEps == 0 ?
                        countdowns.length : totalEps,
                    'nextEp': nextEp
                });
            }).catch(err => {
                console.log('Failed to retrieve airing times.');
                console.log(err);
                msg.channel.send(
                    `There was a problem adding your anime to your list.`
                );
                resolve('err');
            });
        }).catch(err => {
            console.log('Failed to retrieve title of anime.');
            msg.channel.send(
                `There was a problem adding your anime to your list.`);
            resolve('err');
        });
    });
}

/*
Removes an anime from the user's airing list given its name.
*/
function removeAiringAnime(msg) {
    var animeJSON = JSON.parse(fs.readFileSync('airing_anime.json'));
    var animeToRemove = msg.content.split(/\s+/).slice(2).join(' ').trim().toLowerCase();

    if (animeToRemove.length < 4) {
        msg.channel.send('Gomen, include at least the first 4 letters of the anime\'s title.');
        return;
    }

    for (var anime in animeJSON[msg.author.id]) {
        var animeTitle = animeJSON[msg.author.id][anime].title;
        if (animeTitle.toLowerCase().startsWith(animeToRemove)) {
            animeJSON[msg.author.id].splice(anime, 1);
            fs.writeFile('airing_anime.json', JSON.stringify(animeJSON));
            msg.channel.send(
                `**${animeTitle}** has been removed from your airing list! <:inaHappy:301529610754195456>`
            );
            return;
        }
    }

    msg.channel.send(`**${animeToRemove}** isn't in your airing list, ${tool.tsunNoun()}!`);
}

/*
Clears the user's airing list.
*/
function clearAiringList(msg) {
    var idJSON = JSON.parse(fs.readFileSync('airing_anime.json'));
    idJSON[msg.author.id] = [];
    fs.writeFile('airing_anime.json', JSON.stringify(idJSON));
    msg.channel.send('Your airing list has been cleared!');
}

/*
Update the Anilist API access token if needed.

@return A promise, resolved if access token was succesfully updated, rejected if not.
*/
function updateAccessToken() {
    return new Promise((resolve, reject) => {
        if (tokenTimer >= 20)
            return resolve();

        console.log('Anilist access token requested!');
        var options = {
            url: `https://anilist.co/api/auth/access_token?grant_type=client_credentials&client_id=${config.anilist_id}&client_secret=${config.anilist_secret}`,
            method: 'POST'
        };
        rp(options).then(body => {
            console.log('Access token granted!');
            var auth = JSON.parse(body);
            anilistToken = auth.access_token;
            tokenTimer = auth.expires_in;
            resolve();
        }).catch(err => {
            console.log('Failed to receive access token.');
            reject();
        });
    });
}

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

function timer() {
    if (tokenTimer <= 10 && tokenTimer > 0)
        console.log('Anilist access token has expired.');
    if (tokenTimer > 0)
        tokenTimer -= 10;
}
setInterval(timer, 10000);
