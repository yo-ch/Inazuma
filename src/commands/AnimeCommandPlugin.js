const AbstractCommandPlugin = require('../lib/base/AbstractCommandPlugin.js');
const AbstractCommand = require('../lib/base/AbstractCommand.js');

const RichEmbed = require('discord.js').RichEmbed;
const MediaStatus = require('../lib/anime/AiringAnime.js').MediaStatus;
const AnilistUsers = require('../util/mongoose-schema.js').AnilistUsers;

const rp = require('request-promise');
const aniQuery = require('../util/anilist-query.js');
const util = require('../util/util.js');
const sprintf = require('sprintf-js').sprintf;

class AnimeCommandPlugin extends AbstractCommandPlugin {
    constructor() {
        super(
            AnimeCommand,
            WeebifyCommand
        );
    }

    get name() {
        return 'anime';
    }

    get description() {
        return 'anime related commands';
    }
}

class AnimeCommand extends AbstractCommand {
    constructor() {
        super();
        this.choiceTimeout = 20000;
    }

    get name() {
        return 'anime';
    }

    get aliases() {
        return ['ani', 'anilist'];
    }

    async handleMessage({ msg, cmdStr, options }) {
        const searchQuery = cmdStr;

        if (searchQuery) {
            try {
                const searchResults = (await aniQuery.getAnimeInfo(searchQuery)).Page.media;
                if (searchResults.length === 1 || (searchResults.length && !options.choose)) {
                    const animeInfoEmbed = this.getAnimeInfoEmbedByIndex(searchResults, 0);
                    msg.channel.send(animeInfoEmbed);
                } else if (searchResults.length) {
                    // Ask the user to choose from search results.
                    const choiceString =
                        'Choose a number onegai!\n\n' + searchResults.reduce(this.choiceReducer, '');

                    msg.channel.send(choiceString).then((m) => m.delete(this.choiceTimeout));

                    // Wait for response.
                    const collectorFilter =
                        (msg) => parseInt(msg.content) > 0 && parseInt(msg.content) <= searchResults.length;
                    const onResponse =
                        (msg) => {
                            const animeInfoEmbed =
                                this.getAnimeInfoEmbedByIndex(searchResults, parseInt(msg.content) - 1);
                            msg.channel.send(animeInfoEmbed);
                        };

                    msg.channel.createMessageCollector(collectorFilter, {
                        time: this.choiceTimeout,
                        maxMatches: 1
                    }).on('collect', onResponse);
                } else {
                    throw new Error('No results.');
                }
            } catch (err) {
                console.log(err);
                msg.channel.send('Gomen, I couldn\'t find anything!');
            }
        } else {
            msg.channel.send(`Give me an anime to search for, ${util.tsunNoun()}!`);
        }
    }

    getAnimeInfoEmbedByIndex(searchResults, searchResultIndex) {
        const anime = searchResults[searchResultIndex];

        return this.getAnimeInfoEmbed({
            name: anime.title.romaji,
            score: anime.averageScore,
            type: anime.format,
            episodes: anime.episodes,
            synopsis: anime.description,
            url: `https://anilist.co/anime/${anime.id}`,
            image: anime.coverImage.medium,
            seasonInt: anime.seasonInt
        });
    }

    /**
     * Formats the given anime information into an embed.
     * @param {Strings} params Self explanatory.
     */
    getAnimeInfoEmbed({ name, score, type, episodes, synopsis, url, image, seasonInt }) {
        let embed = new RichEmbed();

        if (!episodes) {
            episodes = 'N/A';
        }
        if (!score) {
            score = 'N/A';
        }

        embed.setTitle(name);
        embed.setImage(image);
        embed.addField('Type:', util.wrap(formatType(type)), true);
        embed.addField('Season:', util.wrap(formatSeason(seasonInt)), true);
        embed.addField('Score:', util.wrap(score), true);
        embed.addField('Episodes:', util.wrap(episodes), true);
        embed.addField('Synopsis:', formatSynopsis(synopsis), false);
        embed.setURL(url);
        embed.setColor('BLUE');
        embed.setFooter('Powered by Anilist');

        return embed;

        function formatType(type) {
            const typeStrings = {
                'TV': 'TV',
                'TV_SHORT': 'TV Short',
                'MOVIE': 'Movie',
                'SPECIAL': 'Special',
                'OVA': 'OVA',
                'ONA': 'ONA',
                'MUSIC': 'Music'
            };

            return typeStrings[type] ? typeStrings[type] : type;
        }

        function formatSeason(seasonInt) {
            const seasonStrings = {
                1: 'Winter',
                2: 'Spring',
                3: 'Summer',
                4: 'Fall'
            };
            const seasonData = seasonInt.toString();

            const season = seasonStrings[seasonData.slice(-1)];
            let rawYear = seasonData.slice(0, 2);
            rawYear = parseInt(rawYear) < 52 ? `20${rawYear}` : `19${rawYear}`;

            return season + ' ' + rawYear;
        }

        function formatSynopsis(synopsis) {
            synopsis = synopsis.replace(/<br>\\n|<br>/g, '\n'); // Remove <b> tags.
            synopsis = synopsis.replace(/<i>|<\/i>/g, '*'); // Remove <i> tags.
            synopsis = synopsis.slice(0, synopsis.indexOf('(Source:')).trim(); // Remove source information.

            return synopsis;
        }
    }

    choiceReducer(acc, currChoice, currIndex) {
        let appendString = util.wrap((currIndex + 1) + ' - ' + currChoice.title.romaji);
        return acc + appendString + '\n';
    }
}

class AiringCommand extends AbstractCommandPlugin {
    get name() {
        return 'airing';
    }

    get description() {
        return '';
    }

    async handleMessage({ msg, args }) {
        if (args.length === 0) {
            this.getAiringList(msg);
        } else if (args[0] === 'sync') {
            this.syncUser(msg, args);
        }
    }

    /**
     * Displays user's airing list.
     */
    async getAiringList(msg) {
        try {
            const discordUserId = msg.author.id;
            const anilistUserId = (await AnilistUsers.findOne({ discordUserId })
                .lean().exec()).anilistUserId;
            if (!anilistUserId) {
                return msg.channel.send('Your Anilist profile is not linked to Inazuma.');
            }

            const watchingList =
                (await aniQuery.getUserAiringList(anilistUserId)).MediaListCollection.statusLists
                    .current;

            const airingList = watchingList
                .filter(anime => anime.media.status === MediaStatus.RELEASING ||
                    anime.media.status === MediaStatus.NOT_YET_RELEASED)
                .map(anime => {
                    if (anime.media.nextAiringEpisode.airingAt === null) {
                        anime.media.nextAiringEpisode.airingAt = Infinity;
                    }
                    if (anime.media.title.romaji.length > 43) {
                        anime.media.title.romaji = anime.media.title.romaji.substring(0,
                            43) +
                            '...';
                    }
                    return anime;
                })
                .sort((a, b) =>
                    a.media.nextAiringEpisode.airingAt - b.media.nextAiringEpisode.airingAt
                );

            const listResponse = `#${msg.author.username}'s Airing List\n` +
                airingList.reduce(this.airingMessageReducer, '');
            msg.channel.send(listResponse, { code: 'md' });
        } catch (err) {
            console.log(err);
            msg.channel.send('Gomen, there was a problem retrieving your airing list.');
        }
    }

    /**
     * Syncs the Anilist user to the Discord user, for use with the airing list functions.
     */
    async syncUser(msg, args) {
        const anilistUsername = args[1];
        if (!anilistUsername) {
            return msg.channel.send(`You didn't give me a username, ${util.tsunNoun()}`);
        }

        // Get Anilist Id.
        try {
            const anilistUserId = (await aniQuery.getAnilistUserId(anilistUsername)).User.id;
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
            console.log(err);
            const error = err.error ? JSON.parse(err.error).data : '';
            if (error.length && error === 'Not Found.') {
                msg.channel.send(
                    `Your username is invalid! Please give a valid Anilist username.`);
            } else {
                msg.channel.send(`Gomen, there was a problem syncing your Anilist.`);
            }
        }
    }

    /**
     * Converts a countdown in seconds to days/hours/minutes.
     * @param {Number} seconds The number of seconds.
     */
    convertSecToMin(seconds) {
        let days = Math.floor(seconds / 86400);
        let hours = Math.floor((seconds % 86400) / 3600);
        days = (days === 0) ?
            null :
            days + 'd ';
        hours = (hours === 0) ?
            null :
            hours + 'h';

        if (days === null && hours === null) {
            return `${Math.ceil(seconds / 60)}m`;
        } else {
            return `${days}${hours}`;
        }
    }

    airingMessageReducer(acc, currAnime) {
        let appendString = currAnime.media.nextAiringEpisode.airingAt === Infinity ?
            sprintf('%-50s [ SCHEDULE N/A ]', currAnime.media.title.romaji) :
            sprintf('%-50s  Ep %-3i in %s',
                currAnime.media.title.romaji,
                currAnime.media.nextAiringEpisode.episode,
                this.convertSecToMin(currAnime.media.nextAiringEpisode.airingAt - util.getUnixTime())
            );
        return acc + appendString + '\n';
    }
}

/*
 * Translates from English to Japanese using Google Translate.
 */
class WeebifyCommand extends AbstractCommand {
    constructor() {
        super();
        this.kuroshiro = require('kuroshiro');
        this.kuroshiro.init(err => { if (err) console.log(err); });
    }
    get name() {
        return 'weebify';
    }


    async handleMessage({ msg, cmdStr }) {
        if (!cmdStr) {
            return msg.channel.send(`Give me something to translate, ${util.tsunNoun()}!`);
        }

        const url =
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURI(cmdStr)}`;
        rp({ url: url }).then(body => {
            const result = JSON.parse(body);
            msg.channel.send(result[0][0][0] + '\n' + this.kuroshiro.toRomaji(
                result[0][0][0], { mode: 'spaced' }));
        }).catch(err => console.log(err.message));
    }
}

module.exports = AnimeCommandPlugin;
