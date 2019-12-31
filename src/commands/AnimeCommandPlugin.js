const AbstractCommandPlugin = require('../lib/base/AbstractCommandPlugin.js');
const AbstractCommand = require('../lib/base/AbstractCommand.js');

const rp = require('request-promise');
const { RichEmbed } = require('discord.js');

const anilistUtil = require('../util/anilistUtil.js');
const util = require('../util/util.js');

const MediaStatus = require('../constants/MediaStatus.js');
const ArgError = require('../lib/error/ArgError.js');


class AnimeCommandPlugin extends AbstractCommandPlugin {
    constructor() {
        super(
            AnimeCommand,
            AiringNotificationCommand,
            WeebifyCommand,
        );
    }

    get name() {
        return 'anime';
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
        return ['ani'];
    }

    async handleMessage({ msg, commandStr: searchQuery, options }) {
        if (!searchQuery) {
            return msg.channel.send(`Give me an anime to search for, ${util.tsunNoun()}!`);
        }

        try {
            const searchResults = await anilistUtil.getAnimeInfo(searchQuery);

            if (searchResults.length === 1 ||
                searchResults.length && !(options.choose || options.c)
            ) {
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

        if (!episodes) { episodes = 'N/A'; }
        if (!score) { score = 'N/A'; }

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

class AiringNotificationCommand extends AbstractCommand {
    constructor() {
        super();

        const AiringSeasonMonitor = require('../lib/anime/AiringSeasonMonitor');
        const { AiringSubscribers } = require('../util/mongooseSchema.js');

        // Initialize the airing season monitor that tracks anime airing times.
        this.monitor = new AiringSeasonMonitor((anime) => this.notifyAired(anime));
        this.subscriberDatabase = AiringSubscribers;

        this.functions = {
            subscribe: (params) => this.handleSubscribe(params),
            unsubscribe: (params) => this.handleUnsubscribe(params),
            list: (params) => this.handleListSubscriptions(params),
            sync: (params) => this.handleSyncAnilistUser(params),
        };
    }

    get name() {
        return 'airing';
    }

    get requiresParent() {
        return true;
    }

    /**
     * Notifies subscribers of an anime that it has aired by sending them a direct message.
     * @param {Object} anime Aired anime's details.
     */
    async notifyAired(anime) {
        try {
            const discordUsers = await this.getAnimeSubscribers(anime.id) || [];
            for (const userId of discordUsers) {
                try {
                    const discordUser = await this.parent.client.fetchUser(userId);
                    discordUser.send(util.wrap(`Episode ${anime.nextEpisode}`) + ` of ${util.wrap(anime.name, '**')} has aired.`);
                } catch (err) {
                    console.log(err);
                }
            }
        } catch (err) {
            console.log(err);
        }
    }

    handleMessage({ msg, args, commandStr }) {
        const airingFunction = args[0];
        if (!airingFunction) { return; }
        if (!this.functions[airingFunction]) { msg.channel.send('Invalid airing function.'); }

        const query = commandStr.slice(airingFunction.length).trim();
        this.functions[airingFunction]({ msg, query });
    }

    handleSubscribe({ msg, query }) {
        try {
            if (!query) { throw new ArgError(); }

            const anime = this.findMonitorAnimeByQuery(query);
            this.subscribeUser(anime.id, msg.author.id)
                .then(() => msg.author.send(`Successfully subscribed to ${util.wrap(anime.name, '**')}.`))
                .catch(() => msg.author.send(`Failed to save subscription to ${util.wrap(anime.name, '**')}. Please try again.`));
        } catch (err) {
            console.log(err.message);
            if (err.name === 'ArgError') {
                msg.channel.send('Invalid arguments.');
            } else {
                msg.channel.send('Failed to subscribe, please try again.');
            }
        }
    }

    handleUnsubscribe({ msg, query }) {
        try {
            if (!query) { throw new ArgError(); }

            const anime = this.findMonitorAnimeByQuery(query);
            this.unsubscribeUser(anime.id, msg.author.id)
                .then(() => msg.author.send(`Successfully unsubscribed from ${util.wrap(anime.name, '**')}.`))
                .catch(() => msg.author.send(`Failed to cancel subscription to ${util.wrap(anime.name, '**')}. Please try again.`));
        } catch (err) {
            console.log(err.message);
            if (err.name === 'ArgError') {
                msg.channel.send('Invalid arguments.');
            } else {
                msg.channel.send('Failed to subscribe, please try again.');
            }
        }
    }

    async handleListSubscriptions({ msg }) {
        try {
            const subscriptionList = await this.getUserSubscriptions(msg.author.id) || [];
            const listHeading = util.wrap('Airing Notification Subscriptions:', '**') + '\n';
            const subscriptionsMsg = subscriptionList.map((subscription) => this.monitor.getMonitorAnimeById(subscription.animeId))
                .filter((anime) => !!anime)
                .map((anime) => util.wrap(anime.name) + '\n')
                .sort()
                .reduce((acc, name) => acc + name, listHeading);

            msg.author.send(subscriptionsMsg);
        } catch (err) {
            console.log(err);
            msg.author.send(`Gomen, I couldn't retrieve your list of subscriptions.`);
        }
    }

    async handleSyncAnilistUser({ msg, query: anilistUsername }) {
        try {
            const anilistUserId = await anilistUtil.getUserId(anilistUsername);
            const userWatchingLists = await anilistUtil.getUserWatchingLists(anilistUserId);

            // Get all anime that the user is watching and currently airing.
            const userAiringAnimeIds = userWatchingLists.reduce((acc, list) => [...acc, ...list.entries], [])
                .filter((anime) => anime.media.status === MediaStatus.RELEASING)
                .map((anime) => anime.media.id);

            const subscribePromises = userAiringAnimeIds.map((animeId) => this.subscribeUser(animeId, msg.author.id));
            const results = await Promise.all(subscribePromises);
            msg.author.send(`Succesfully subscribed to airing notifications for ${util.wrap(results.length)} anime.`);
        } catch (err) {
            console.log(err);
            const error = err.error ? JSON.parse(err.error).data : '';
            if (error === 'Not Found.') {
                msg.author.send('Please give me a valid Anilist username.');
            } else {
                msg.author.send('Gomen, there was a problem syncing your Anilist anime list.');
            }
        }
    }

    /**
     * Subscribes a user to airing notifications for the given anime.
     * @param {Number} animeId The id of the anime to subscribe to.
     * @param {String} userId The discord id of the user to subscribe.
     * @return {Promise}
     */
    subscribeUser(animeId, userId) {
        return this.subscriberDatabase.updateOne(
            { animeId },
            { $addToSet: { discordUsers: userId } },
            { upsert: true }
        );
    }

    /**
     * Unsubscribes a user from airing notifications for the given anime.
     * @param {Number} animeId The id of the anime to unsubcribe from.
     * @param {String} userId The discord id of the user to unsubscribe.
     * @return {Promise}
     */
    unsubscribeUser(animeId, userId) {
        return this.subscriberDatabase.updateOne(
            { animeId },
            { $pull: { discordUsers: userId } },
        );
    }

    getUserSubscriptions(userId) {
        return this.subscriberDatabase.find(
            { discordUsers: { $all: userId } },
            { animeId: true }
        );
    }

    getAnimeSubscribers(animeId) {
        return this.subscriberDatabase.findOne(
            { animeId: animeId },
            { discordUsers: true }
        ).lean().then((result) => result && result.discordUsers);
    }

    /**
     * Finds the AiringAnime in the monitor given a query.
     * @param {String} subscribeQuery A URL for the Anilist anime or the name of the anime to find.
     * @return {AiringAnime}
     * @throws {String} A reason for failing to find the AiringAnime.
     */
    findMonitorAnimeByQuery(subscribeQuery) {
        if (subscribeQuery.indexOf('anilist.co/anime') > -1) {
            // Find AiringAnime given an Anilist anime url.
            const matchIdResult = subscribeQuery.match(/anilist\.co\/anime\/(\d+)/);
            if (!matchIdResult) { throw new ArgError('Invalid Anilist anime link.'); }

            const monitorAnime = this.monitor.getMonitorAnimeById(matchIdResult[1]);
            if (!monitorAnime) { throw new ArgError('This anime is not currently airing.'); }

            return monitorAnime;
        } else {
            // Find AiringAnime given a name.
            const monitorAnime = this.monitor.getMonitorAnimeByName(subscribeQuery);
            if (!monitorAnime) { throw new ArgError(`Sorry there's no anime airing by the name ${util.wrap(subscribeQuery)}.`); }

            return monitorAnime;
        }
    }
}

/**
 * Translates from English to Japanese using Google Translate.
 */
class WeebifyCommand extends AbstractCommand {
    constructor() {
        super();
        this.kuroshiro = require('kuroshiro');
        this.kuroshiro.init((err) => {
            if (err) {
                console.log(err);
            }
        });
    }

    get name() {
        return 'weebify';
    }

    async handleMessage({ msg, commandStr }) {
        if (!commandStr) {
            return msg.channel.send(`Give me something to translate, ${util.tsunNoun()}!`);
        }

        const url =
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURI(commandStr)}`;

        try {
            const body = await rp({ url });
            const result = JSON.parse(body);
            msg.channel.send(result[0][0][0] + '\n' + this.kuroshiro.toRomaji(result[0][0][0], { mode: 'spaced' }));
        } catch (err) {
            console.log(err.message);
        }
    }
}

module.exports = AnimeCommandPlugin;
