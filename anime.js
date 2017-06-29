var searchData = '';
var anilistSearch = false;
var searchChoices = 0;
var searchClient = '';

const config = require('./config.json');
const tool = require('./tool.js')

var self = module.exports = {
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
            config.anilist_token = auth.access_token;
            config.anilist_token_expires_in = auth.expires_in;
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
        if (config.anilist_token_expires_in === 0) { //Request new token if current token is expired.
            self.requestAccessToken(msg, self.retrieveAnilistData);
            return;
        }

        var search = msg.content.split(/\s+/).slice(1);
        if (search.length >= 1) { //A search query was given.
            var request = require('request');
            var options = {
                url: `https://anilist.co/api/anime/search/${search}?access_token=${config.anilist_token}`
            };

            function callback(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var results = JSON.parse(body);

                    if (results.length == 1) { //Send results.
                        var ais = self.animeInfoString(results[0].title_romaji, results[0].average_score, results[0].type, results[0].total_episodes, results[0].description, `https://anilist.co/anime/${results[0].id}/`);
                        msg.channel.send(ais);
                    } else if (results.length >= 2) { //Store results to retrieve when user replies with a choice.
                        searchData = body;
                        anilistSearch = true;
                        searchChoices = results.length;
                        searchClient = msg.author.id;

                        var choiceString = 'Choose a number onegai!\n\n';

                        var i;
                        for (i = 0; i < results.length; i++)
                            choiceString += `${tool.wrap(`${i+1} - ${results[i].title_romaji}`)}\n`;

                        msg.channel.send(choiceString);
                    } else
                        msg.channel.send('Gomen, I couldn\'t find anything!');
                }
            }
            request(options, callback);
        } else
            msg.channel.send(`Give me an anime to search for, ${self.tsunNoun()}!`);
    },

    /*
    Chooses the from one of the options given when the user called the anilist command.
    */
    anilistChoose: function(msg, choice) {
        if (!anilistSearch || msg.author.id != searchClient) return;
        if (choice > 0 && choice <= searchChoices) {
            var results = JSON.parse(searchData);
            var anime = results[choice - 1];

            var ais = self.animeInfoString(anime.title_romaji, anime.average_score, anime.type, results[0].total_episodes, anime.description, `https://anilist.co/anime/${anime.id}/`);
            msg.channel.send(ais);

            anilistSearch = false;
            searchData = '';
            searchChoices = 0;
            searchClient = '';
        }
    },

    /*
    Formats the given anime information.
    */
    animeInfoString: function(name, score, type, episodes, synopsis, url) {
        //Format synopsis.
        var syn = synopsis.replace(/<br>\\n|<br>/g, '\n');
        syn = syn.replace(/<i>|<\/i>/g, '*');
        syn = syn.slice(0, syn.indexOf('(Source:')).trim();

        var info =
            `**${name}** (${url})\n**Score:** ${score}\n**Type:** ${type}\n**Episodes:** ${episodes}\n\n${syn}\n\n`;

        return info;
    },

    /*
    Displays airing data of anime in the airing list.
    */
    retrieveAiringData: function(msg) {
        var sprintf = require('sprintf-js').sprintf;
        var fs = require('fs');

        var anime, animeJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());
        if (animeJSON.anime.length == 0) {
            msg.channel.send(`There aren\'t any anime in the airing list, ${self.tsunNoun()}.`);
            return;
        }

        var info = [];
        for (anime of animeJSON.anime) {
            var unixts = Math.round((new Date()).getTime() / 1000);

            while (anime.countdowns[anime.nextEp - 1] < unixts && anime.countdowns.length > anime.nextEp) //Episode has aired, increment next ep.
                anime.nextEp += 1;

            var countdown = anime.countdowns[anime.nextEp - 1] - unixts;
            var title = anime.title.length > 43 ? `${anime.title.substring(0,43)}...` : anime.title;

            if (anime.totalEps < anime.nextEp)
                info.push([sprintf('%-50s DONE AIRING\n', title), Infinity]);
            else
                info.push([sprintf('%-50s Ep %-3i in %s\n', title, anime.nextEp, self.secondsToCountdown(countdown)), countdown]);
        }

        info.sort(function(a, b) { //Sorts, starting with anime closest to airing.
            return a[1] - b[1]; //compare countdowns.
        });

        var i;
        var airing = '';
        for (i = 0; i < info.length; i++) //Add info to airing string.
            airing += info[i][0];

        var airingListPromise = msg.channel.send(`${airing}`, { 'code': true });
        fs.writeFile('airing_anime.json', JSON.stringify(animeJSON)); //Update file.

        setTimeout(() => { //Delete airing message after 5 minutes.
            airingListPromise.then(airingMsg => {
                msg.delete();
                airingMsg.delete();
            });
        }, 300000);
    },

    /*
    Adds an anime to the airing list using it's URL.
    */
    addAiringAnime: function(msg) {
        if (config.anilist_token_expires_in === 0) { //Request new token if current token is expired.
            self.requestAccessToken(msg, self.addAiringAnime);
            return;
        }

        var rp = require('request-promise');
        var fs = require('fs');

        var animeJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());

        var animeToAdd = msg.content.split(/\s+/)[2];
        if (!animeToAdd) return;

        var id = animeToAdd.match(/\/\d+\//g);
        if (!id) //No matches in regex.
        {
            msg.channel.send(`Invalid link, ${self.tsunNoun()}!`);
            return;
        }
        id = id[0].slice(1, id[0].length - 1); //Extract match.

        var countdowns = []; //Data to write to JSON file.
        var title = '';
        var nextEp = null;
        var totalEps;

        var options = {
            url: `https://anilist.co/api/anime/${id}?access_token=${config.anilist_token}`
        }

        rp(options).then(body => { //Retrieve title of anime.
            results = JSON.parse(body);
            title = results.title_romaji;
            totalEps = results.total_episodes;

            if (results.airing_status != 'currently airing') {
                msg.channel.send(`**${title}** isn't currently airing, ${self.tsunNoun()}!`);
                return;
            }

            for (var anime of animeJSON.anime) { //Check if anime is already in the list.
                if (anime.title == title) {
                    msg.channel.send(`**${title}** is already in the airing list, ${self.tsunNoun()}!`);
                    return;
                }
            }

            options = {
                url: `https://anilist.co/api/anime/${id}/airing?access_token=${config.anilist_token}`
            }

            rp(options).then(body => { //Retrieve airing times for each episode of the anime.
                var results = JSON.parse(body);
                var ep;
                for (ep in results) {
                    countdowns.push(results[ep]);
                }

                var unixts = Math.round((new Date()).getTime() / 1000); //Get current unix time.
                for (var i = 0; i < countdowns.length; i++) { //Get next ep number.
                    if (countdowns[i] > unixts) {
                        nextEp = i + 1; //Add 1 because we started at 'ep 0' technically.
                        break;
                    }
                }
                if (nextEp === null) nextEp = totalEps + 1;

                var anime = {
                    'title': title.trim(),
                    'countdowns': countdowns,
                    'totalEps': totalEps,
                    'nextEp': nextEp
                }

                animeJSON.anime.push(anime);
                fs.writeFile('airing_anime.json', JSON.stringify(animeJSON));
                msg.channel.send(`**${title}** has been added to the airing list! <:inaHappy:301529610754195456>`);
            }).catch(err => {
                console.log('Failed to retrieve airing times.');
                msg.channel.send(`There was a problem adding your anime to the list.`);
            });
        }).catch(err => {
            console.log('Failed to retrieve title of anime.');
            msg.channel.send(`There was a problem adding your anime to the list.`);
        });
    },

    /*
    Removes an anime from the airing list given its display name in the list.
    */
    removeAiringAnime: function(msg) {
        if (!msg.guild) return;

        if (!msg.member.roles.has(msg.guild.roles.find('name', 'Weeb').id)) {
            msg.channel.send('Gomen, you\'re not a weeb!');
            return;
        }

        var fs = require('fs');
        var animeJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());
        var animeToRemove = msg.content.substring(11).trim();

        for (var i = 0; i < animeJSON.anime.length; i++) {
            var currAnimeTitle = animeJSON.anime[i].title.trim()
            if (currAnimeTitle.startsWith(animeToRemove)) {
                animeJSON.anime.splice(i, 1);
                fs.writeFile('airing_anime.json', JSON.stringify(animeJSON));
                msg.channel.send(`**${currAnimeTitle}** has been removed from the airing list! <:inaHappy:301529610754195456>`);
                return;
            }
        }

        msg.channel.send(`**${animeToRemove}** isn't in the airing list, ${self.tsunNoun()}!`);
    },

    /*
    Clears the airing list.
    */
    clearAiringList: function(msg) {
        if (msg.channel.type == 'dm') return;

        if (!msg.member.roles.has(msg.guild.roles.find('name', 'Weeb').id)) {
            msg.channel.send('Gomen, you\'re not a weeb!');
            return;
        }

        var fs = require('fs');

        var idJSON = JSON.parse(fs.readFileSync('airing_anime.json').toString());
        idJSON.anime = [];
        fs.writeFile('airing_anime.json', JSON.stringify(idJSON));
        msg.channel.send('The airing list has been cleared!');
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
        let nouns = ['b-baka', 's-stupid', 'd-dummy', 'baaaka', '<:inaBaka:301529550783774721>', 'dummy'];
        return nouns[tool.randint(nouns.length)];
    }

}
