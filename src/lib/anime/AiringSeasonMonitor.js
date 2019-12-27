const AiringAnime = require('./AiringAnime.js');
const util = require('../../util/util.js');
const anilistUtil = require('../../util/anilistUtil.js');
const MediaStatus = require('../../constants/MediaStatus.js');

const CHECK_AIRED_INTERVAL = 60000; // Every minute.
const UPDATE_SEASON_INTERVAL = 3600000; // Every hour.
const PRUNE_INTERVAL = 86400000; // Every day.

const PRUNE_THRESHOLD_MS = 604800000; // Every week.

/**
 * Monitors when anime air for the current season of anime.
 */
class AiringSeasonMonitor {
    constructor(onAnimeAir) {
        this.season = {};
        this.initSeason();
        this.onAnimeAir = onAnimeAir;

        this.checkAiredInterval = setInterval(() => {
            this.checkAiringAnimeAired();
        }, CHECK_AIRED_INTERVAL);

        this.updateSeasonInterval = setInterval(() => {
            this.updateSeason();
        }, UPDATE_SEASON_INTERVAL);

        this.pruneInterval = setInterval(() => {
            this.pruneSeason();
        }, PRUNE_INTERVAL);
    }

    /**
     * Initializes the season with data.
     */
    async initSeason() {
        try {
            const seasonAiringInfo = await anilistUtil.getSeasonAiringInfo();
            for (const anime of seasonAiringInfo) {
                this.startMonitoringAnime(anime);
            }
        } catch (err) {
            console.log('Error initializing season airing info.', err);
        }
    }

    /**
     * Updates the season list with the latest airing info.
     */
    async updateSeason() {
        try {
            const seasonAiringInfo = await anilistUtil.getSeasonAiringInfo();
            for (const anime of seasonAiringInfo) {
                if (anime.status !== MediaStatus.RELEASING) {
                    // Stop monitoring since anime is done.
                    this.stopMonitoringAnime(anime.id);
                }

                if (this.isMonitoringAnime(anime.id)) {
                    // Update airing info.
                    this.getMonitorAnimeById(anime.id).updateAiringInfo(anime.airingSchedule.nodes);
                } else {
                    // Add new anime to season.
                    this.startMonitoringAnime(anime);
                }
            }
        } catch (err) {
            console.log('Error updating season airing info.', err);
        }
    }

    /**
     * Checks each anime in the season list to see if they have aired.
     */
    async checkAiringAnimeAired() {
        try {
            for (const seasonAnime of Object.values(this.season)) {
                while (seasonAnime.hasAired()) {
                    this.onAnimeAir({ ...seasonAnime });
                    seasonAnime.onAir();
                }
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Prunes anime from the season list when they haven't been updated in more than a week.
     */
    pruneSeason() {
        for (const seasonAnime of Object.values(this.season)) {
            if (util.getUnixTime() - seasonAnime.lastUpdated > PRUNE_THRESHOLD_MS) {
                this.stopMonitoringAnime(seasonAnime.id);
                // TODO: Delete from database too.
            }
        }
    }

    /**
     * Starts monitoring the given anime for when it airs.
     * @param {Object} anime The data retrieved from Anilist for this anime.
     */
    startMonitoringAnime(anime) {
        if (!anime.airingSchedule.nodes.length) {
            return;
        }

        const formattedData = {
            id: anime.id,
            name: anime.title.romaji,
            synonyms: [anime.title.english, anime.title.native, ...anime.synonyms].filter((s) => !!s),
            airingInfo: anime.airingSchedule.nodes
        };

        this.season[anime.id] = new AiringAnime(formattedData);
    }

    /**
     * Stops monitoring the given anime.
     * @param {Number} animeId The id of the anime on Anilist.
     */
    stopMonitoringAnime(animeId) {
        delete this.season[animeId];
    }

    /**
     * Check if the given anime is currently being monitored.
     * @param {Number} animeId The id of the anime on Anilist.
     * @return {Boolean} 
     */
    isMonitoringAnime(animeId) {
        return !!this.season[animeId];
    }

    /**
     * Returns the AiringAnime object specified by anime id.
     * @param {Number} id The id of the anime on Anilist.
     * @return {AiringAnime} 
     */
    getMonitorAnimeById(id) {
        return this.season[id];
    }

    /**
     * Returns the AiringAnime object specified by the anime's name.
     * @param {String} name The name of the anime.
     * @return {AiringAnime}
     */
    getMonitorAnimeByName(name) {
        return Object.values(this.season).find(
            (anime) => anime.name.indexOf(name) > -1 || anime.synonyms.indexOf(name) > -1
        );
    }
}

module.exports = AiringSeasonMonitor;
