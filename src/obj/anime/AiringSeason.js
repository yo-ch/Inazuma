const AiringAnime = require('./AiringAnime.js');
const aniQuery = require('../../util/anilist-query.js');

const CHECK_AIRED_INTERVAL = 300000;
const UPDATE_SEASON_INTERVAL = 43200000;

/**
 * A collection of currently airing anime this season.
 */
class AiringSeason {
    constructor(seasonAiringData, onAiring) {
        this.season = {};
        this.onAiring = onAiring;
        this.updateSeasonAiringData(seasonAiringData);

        this.setIntervals();
    }

    /**
     * Update the season's anime list along with their next airing episode data.
     * @param {Object} seasonAiringData Optional - The season airing data to use to update.
     */
    async updateSeasonAiringData(seasonAiringData = null) {
        console.log('big check');
        try {
            // Get the up-to-date season data if necessary.
            seasonAiringData = seasonAiringData ?
                seasonAiringData : (await aniQuery.getSeasonAiringData()).Page.media;

            // Transform data to local format.
            for (const airingData of seasonAiringData) {
                // Don't need to maintain if anime will not be airing any more.
                if (airingData.status === AiringAnime.MediaStatus.CANCELLED ||
                    airingData.status === AiringAnime.MediaStatus.FINISHED) {
                    delete this.season[airingData.id];
                    continue;
                }

                if (this.season[airingData.id]) {
                    this.season[airingData.id].updateAiringData(airingData);
                } else {
                    let formattedData = {
                        id: airingData.id,
                        status: airingData.status,
                        name: airingData.title.romaji,
                        nextAiringEpisode: airingData.nextAiringEpisode
                    }
                    this.season[airingData.id] = new AiringAnime(formattedData);
                }
            }
        } catch (err) {
            console.log('Error updating season airing data.', err);
        }
    }

    /**
     * Check each anime in the season list to see if they have aired.
     */
    async checkAiringAnimeAired() {
        try {
            let updates = [];
            for (const anime of Object.values(this.season)) {
                updates.push(anime.updateAiringData());
            }

            let checkResults = await Promise.all(updates.map(p => p.catch(() => null)));
            for (const result of checkResults) {
                if (result && result.aired) { this.onAiring(result.anime);
                    console.log(result) }
            }
        } catch (err) {
            console.log(err);
        }

    }

    /**
     * Set up the intervals that will periodically update the season list and airing data.
     */
    setIntervals() {
        //Check every 5 mins to see if an anime has aired.
        let tick = 0;
        setInterval(() => {
            tick += 1;
            console.log('checking');
            // Skip check when season updates overlap.
            if (tick % (UPDATE_SEASON_INTERVAL / CHECK_AIRED_INTERVAL) !== 0) this.checkAiringAnimeAired();
        }, CHECK_AIRED_INTERVAL);

        // Update every 12 hours.
        setInterval(() => this.updateSeasonAiringData, UPDATE_SEASON_INTERVAL);
    }
}

module.exports = AiringSeason;
