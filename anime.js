const config = require('./config.json');
const tool = require('./tool.js')

var searchRequests = {};

var self = module.exports = {
    'anilistToken': '',
    'tokenTimer': 0,

    /*
    Request an API access token from the Anilist API.
    */
    requestAccessToken: function(msg, callback) {
        var rp = require('request-promise');
        var options = {
            url: `https://anilist.co/api/auth/access_token?grant_type=client_credentials&client_id=${config.anilist_id}&client_secret=${config.anilist_secret}`,
            method: 'POST',
        };

        rp(options).then(body => { //Wait for access token to be returned.
            console.log('Access token granted!')
            var auth = JSON.parse(body);
            self.anilistToken = auth.access_token;
            self.tokenTimer = auth.expires_in;
            callback(msg);
        }).catch(function(err) {
            console.log('Failed to receive access token.')
        });
        console.log('Anilist access token requested!');
    },

    /*
    Retrieve the specified data from Anilist.
    */
    retrieveAnilistData: function(msg) {
        if (self.tokenTimer <= 0) { //Request new token if current token is expired.
            self.requestAccessToken(msg, self.retrieveAnilistData);
            return;
        }

        var search = msg.content.split(/\s+/).slice(1);
        if (search.length >= 1) { //A search query was given.
            var request = require('request');
            var options = {
                url: `https://anilist.co/api/anime/search/${search}?access_token=${self.anilistToken}`
            };

            function callback(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var results = JSON.parse(body);

                    if (results.length == 1) { //Send results.
                        var ais = self.animeInfoString(results[0].title_romaji,
                            results[0].average_score, results[0].type,
                            results[0].total_episodes, results[0].description,
                            `https://anilist.co/anime/${results[0].id}/`);
                        msg.channel.send(ais);
                    } else if (results.length >= 2) { //Store results to retrieve when user replies with a choice.
                        var searchResults = {
                            'searchData': body,
                            'searchChoices': results.length
                        };
                        searchRequests[msg.author.id] = searchResults;

                        var choiceString = 'Choose a number onegai!\n\n';

                        for (var i = 0; i < results.length; i++)
                            choiceString +=
                            `${tool.wrap(`${i+1} - ${results[i].title_romaji}`)}\n`;
                        msg.channel.send(choiceString);
                    } else
                        msg.channel.send('Gomen, I couldn\'t find anything!');
                }
            }
            request(options, callback);
        } else
            msg.channel.send(
                `Give me an anime to search for, ${self.tsunNoun()}!`);
    },

    /*
    Replies with specified anime data after user has chosen a number.
    */
    anilistChoose: function(msg, choice) {
        var request = searchRequests[msg.author.id];
        if (!request) return; //User does not have a search active.

        if (choice > 0 && choice <= request.searchChoices) {
            var results = JSON.parse(request.searchData);
            var anime = results[choice - 1];

            var ais = self.animeInfoString(anime.title_romaji, anime.average_score,
                anime.type, results[0].total_episodes, anime.description,
                `https://anilist.co/anime/${anime.id}/`);
            msg.channel.send(ais);

            delete searchRequests[msg.author.id];
        }
    },

    /*
    Formats the given anime information.
    */
    animeInfoString: function(name, score, type, episodes, synopsis, url) {
        //Format synopsis.
        var syn = synopsis.replace(/<br>\\n|<br>/g, '\n');
        syn = syn.replace(/<i>|<\/i>/g, '*');
        syn = syn.slice(0, syn.indexOf('(Source:')).trim(); //Remove source information.

        return `**${name}** (${url})\n**Score:** ${score}\n**Type:** ${type}\n**Episodes:** ${episodes}\n\n${syn}\n\n`;
    },

    /*
    Displays airing data of anime in the user's airing list.
    */
    retrieveAiringData: function(msg) {
        var sprintf = require('sprintf-js').sprintf;
        var fs = require('fs');

        var anime, animeJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());
        if (!animeJSON[msg.author.id]) {
            msg.channel.send(
                `There aren\'t any anime in your airing list, ${self.tsunNoun()}.`
            );
            return;
        }

        var info = [];
        for (anime of animeJSON[msg.author.id]) {
            var unixts = Math.round((new Date()).getTime() / 1000);

            while (anime.countdowns[anime.nextEp - 1] < unixts && anime.countdowns
                .length > anime.nextEp) //Episode has aired, increment next ep.
                anime.nextEp += 1;

            var countdown = anime.countdowns[anime.nextEp - 1] - unixts;
            var title = anime.title.length > 43 ?
                `${anime.title.substring(0,43)}...` : anime.title;

            if ((anime.totalEps < anime.nextEp && anime.totalEps > 0) ||
                countdown < 0)
                info.push([sprintf('%-50s DONE AIRING\n', title), Infinity]);
            else
                info.push([sprintf('%-50s Ep %-3i in %s\n', title, anime.nextEp,
                    self.secondsToCountdown(countdown)), countdown]);
        }

        info.sort(function(a, b) { //Sorts, starting with anime closest to airing.
            return a[1] - b[1]; //compare countdowns.
        });

        var i;
        var airing = `#${msg.author.username}'s Airing List\n`;
        for (i = 0; i < info.length; i++) //Add info to airing string.
            airing += info[i][0];

        var airingListPromise = msg.channel.send(`${airing}`, { 'code': 'md' });
        fs.writeFile('airing_anime.json', JSON.stringify(animeJSON)); //Update file.

        setTimeout(() => { //Delete airing message after 5 minutes.
            airingListPromise.then(airingMsg => {
                msg.delete();
                airingMsg.delete();
            });
        }, 300000);
    },

    /*
    Adds anime to the airing list of the user using their URLs.
    */
    addAiringAnime: function(msg) {
        if (self.tokenTimer <= 0) { //Request new token if current token is expired.
            self.requestAccessToken(msg, self.addAiringAnime);
            return;
        }

        var animeToAdd = msg.content.split(/\s+/).slice(2);
        if (!animeToAdd) return;

        var ids = [];
        for (var i = 0; i < animeToAdd.length; i++) {
            var id = animeToAdd[i].match(/\/\d+\//g);
            if (!id) { //No matches in regex.
                msg.channel.send(`Invalid link, ${self.tsunNoun()}!`);
                continue;
            }
            ids.push(id[0].slice(1, id[0].length - 1));
        }
        if (ids.length == 0) return;

        self.addAiringInner(msg, ids);
    },

    /*
    Recursive function that adds each anime given by their IDs to the user's airing list.
    */
    addAiringInner: function(msg, ids) {
        var rp = require('request-promise');
        var fs = require('fs');

        var countdowns = []; //Data to write to JSON file.
        var title = '';
        var nextEp = null;
        var totalEps;

        var options = {
            url: `https://anilist.co/api/anime/${ids[0]}?access_token=${self.anilistToken}`
        }

        rp(options).then(body => { //Retrieve title of anime.
            results = JSON.parse(body);
            title = results.title_romaji;
            totalEps = results.total_episodes;

            if (results.airing_status != 'currently airing') {
                msg.channel.send(
                    `**${title}** isn't currently airing, ${self.tsunNoun()}!`
                );
                return;
            }

            options = {
                url: `https://anilist.co/api/anime/${ids[0]}/airing?access_token=${self.anilistToken}`
            }

            rp(options).then(body => { //Retrieve airing times for each episode of the anime.
                var results = JSON.parse(body);
                var ep;
                for (ep in results) {
                    countdowns.push(results[ep]);
                }

                if (countdowns.length == 0) {
                    msg.channel.send(
                        `Gomen, airing times for **${title}** are not available yet.`
                    );
                    return;
                }

                var unixts = Math.round((new Date()).getTime() /
                    1000); //Get current unix time.
                for (var i = 0; i < countdowns.length; i++) { //Get next ep number.
                    if (countdowns[i] > unixts) {
                        nextEp = i + 1; //Add 1 because we started at 'ep 0' technically.
                        break;
                    }
                }
                if (!nextEp) nextEp = totalEps + 1;

                var anime = {
                    'title': title.trim(),
                    'countdowns': countdowns,
                    'totalEps': totalEps == 0 ? countdowns.length :
                        totalEps,
                    'nextEp': nextEp
                }

                var animeJSON = JSON.parse(fs.readFileSync(
                    'airing_anime.json').toString());

                if (!animeJSON[msg.author.id])
                    animeJSON[msg.author.id] = [];
                animeJSON[msg.author.id].push(anime);

                fs.writeFile('airing_anime.json', JSON.stringify(
                    animeJSON));
                msg.channel.send(
                    `**${anime.title}** has been added to the airing list! <:inaHappy:301529610754195456>`
                );

                ids.shift();
                if (ids.length > 0)
                    self.addAiringInner(msg, ids);
            }).catch(err => {
                console.log('Failed to retrieve airing times.');
                msg.channel.send(
                    `There was a problem adding your anime to the list.`
                );

                ids.shift();
                if (ids.length > 0)
                    self.addAiringInner(msg, ids);
            });
        }).catch(err => {
            console.log(err);
            console.log('Failed to retrieve title of anime.');
            msg.channel.send(
                `There was a problem adding your anime to the list.`);

            ids.shift();
            if (ids.length > 0)
                self.addAiringInner(msg, ids);
        });
    },

    /*
    Removes an anime from the user's airing list given its name.
    */
    removeAiringAnime: function(msg) {
        var fs = require('fs');
        var animeJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());
        var animeToRemove = msg.content.substring(10).trim().toLowerCase();

        if (animeToRemove.length < 4) {
            msg.channel.send(
                'Gomen, include at least the first 4 letters of the anime\'s title.'
            );
            return;
        }

        for (var i = 0; i < animeJSON[msg.author.id].length; i++) {
            var currAnimeTitle = animeJSON[msg.author.id][i].title.trim()
            if (currAnimeTitle.toLowerCase().startsWith(animeToRemove)) {
                animeJSON[msg.author.id].splice(i, 1);
                fs.writeFile('airing_anime.json', JSON.stringify(animeJSON));
                msg.channel.send(
                    `**${currAnimeTitle}** has been removed from your airing list! <:inaHappy:301529610754195456>`
                );
                return;
            }
        }

        msg.channel.send(
            `**${animeToRemove}** isn't in your airing list, ${self.tsunNoun()}!`
        );
    },

    /*
    Clears the user's airing list.
    */
    clearAiringList: function(msg) {
        var fs = require('fs');

        var idJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());
        idJSON[msg.author.id] = [];
        fs.writeFile('airing_anime.json', JSON.stringify(idJSON));
        msg.channel.send('Your airing list has been cleared!');
    },

    /*
    Converts a countdown in seconds to days/hours/minutes.
    */
    secondsToCountdown: function(seconds) {
        var days = Math.floor(seconds / 86400);
        var hours = Math.floor((seconds % 86400) / 3600);

        days = (days == 0) ? '' : days + 'd ';
        hours = (hours == 0) ? '' : hours + 'h';

        if (days == '' && hours == '') {
            return `${Math.ceil(seconds/60)}m`;
        } else {
            return `${days}${hours}`;
        }
    },

    /*
    Returns a random tsundere noun.
    */
    tsunNoun: function() {
        let nouns = ['b-baka', 's-stupid', 'd-dummy', 'baaaka',
            '<:inaBaka:301529550783774721>', 'dummy'
        ];
        return nouns[tool.randint(nouns.length)];
    }
}

function timer() {
    if (self.tokenTimer <= 10 && self.tokenTimer > 0)
        console.log('Anilist access token has expired.');
    if (self.tokenTimer > 0) self.tokenTimer -= 10;
}
setInterval(timer, 10000);
