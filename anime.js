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
    'clearAiringList': clearAiringList
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
                media (search: $search, type:ANIME) {
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
        }).catch(() => {
            msg.channel.send('Gomen, I couldn\'t find anything!');
        });
    } else {
        msg.channel.send(`Give me an anime to search for, ${tool.tsunNoun()}!`);
    }
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
Displays airing data of anime in the user's airing list.
*/
function retrieveAiringData(msg) {
    var anime,
        animeJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());
    if (!animeJSON[msg.author.id] || animeJSON[msg.author.id].length === 0) {
        msg.channel.send(`There aren\'t any anime in your airing list, ${tool.tsunNoun()}.`);
        return;
    }

    var info = [];
    for (anime of animeJSON[msg.author.id]) {
        var unixts = Math.round((new Date()).getTime() / 1000);

        while (anime.countdowns[anime.nextEp - 1] < unixts && anime.countdowns.length > anime.nextEp) //Episode has aired, increment next ep.
            anime.nextEp += 1;

        var countdown = anime.countdowns[anime.nextEp - 1] - unixts;
        var title = anime.title.length > 43 ?
            `${anime.title.substring(0, 43)}...` :
            anime.title;

        if ((anime.totalEps < anime.nextEp && anime.totalEps > 0) || countdown < 0)
            info.push([
                sprintf('%-50s -- DONE AIRING --\n', title),
                Infinity
            ]);
        else
            info.push([
                sprintf('%-50s Ep %-3i in %s\n', title, anime.nextEp, secondsToCountdown(
                    countdown)),
                countdown
            ]);
    }

    info.sort((a, b) => { //Sorts, starting with anime closest to airing.
        return a[1] - b[1]; //compare countdowns.
    });

    var i;
    var airing = `#${msg.author.username}'s Airing List\n`;
    for (i = 0; i < info.length; i++) //Add info to airing string.
        airing += info[i][0];

    var airingListPromise = msg.channel.send(`${airing}`, {
        'code': 'md'
    });
    fs.writeFile('airing_anime.json', JSON.stringify(animeJSON)); //Update file.

    setTimeout(() => { //Delete airing message after 5 minutes.
        airingListPromise.then(airingMsg => {
            msg.delete();
            airingMsg.delete();
        });
    }, 300000);
}

/*
Adds anime to the airing list of the user using their URLs.
*/
function addAiringAnime(msg) {
    updateAccessToken().then(() => {
        var animeToAdd = msg.content.split(/\s+/).slice(2);
        if (!animeToAdd)
            return;

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

        var animeJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());
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
    }).catch(error => {
        msg.channel.send(`${tool.inaError} Gomen, I couldn't add your anime to the list.`);
    });
}

/*
Gets airing information for anime by their IDs on Anilist.

@param String id - The id of the anime.
@return Promise - resolved if info was succesfully retrieved, and reject if not.
*/
function addAiringInner(msg, id) {
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
                    `**${title}** isn't currently airing, ${tool.tsunNoun()}!`);
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
                    `**${title}** has been added to your airing list!`);

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
            msg.channel.send(`There was a problem adding your anime to your list.`);
            resolve('err');
        });
    });
}

/*
Removes an anime from the user's airing list given its name.
*/
function removeAiringAnime(msg) {
    var animeJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());
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
    var idJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());
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
    type = formatType[type];

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
