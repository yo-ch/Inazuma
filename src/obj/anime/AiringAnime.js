const tool = require('../../util/tool.js');
const aniQuery = require('../..//util/anilist-query.js');

/**
 * A currently airing anime.
 */
class AiringAnime {
    constructor(anime) {
        this.id = anime.id;
        this.status = anime.status;
        this.name = anime.name;
        this.nextAiringEpisode = anime.nextAiringEpisode;
    }

    //Anilist GraphQL MediaStatus enum.
    static get MediaStatus() {
        return {
            FINISHED: 'FINISHED',
            RELEASING: 'RELEASING',
            NOT_YET_RELEASED: 'NOT_YET_RELEASED',
            CANCELLED: 'CANCELLED'
        }
    }

    /**
     * Updates the airing data of this anime if applicable.
     * @param {Object} animeAiringData Optional - The airing data to use to update the episode.
     * @returns {Object} the AiringAnime object and the aired status or just the aired status if not aired.
     */
    async updateAiringData(animeAiringData = null) {
        let returnData = (aired) => {
            return aired ? { anime: this, episode: this.nextEpisode - 1, aired, } : { aired };
        }

        if (this.isAiring() &&
            (this.hasAired() || this.isMissingAiringData() || animeAiringData)) {
            try {
                // Get the up-to-date schedule for the anime if necessary.
                let currentEpisode = this.nextAiringEpisode.episode;
                let updatedAnimeInfo = animeAiringData ?
                    animeAiringData : (await aniQuery.getAiringData(this.id)).Media;

                this.status = updatedAnimeInfo.status;
                this.nextAiringEpisode = updatedAnimeInfo.nextAiringEpisode;
                return returnData(this.nextAiringEpisode.episode > currentEpisode);
            } catch (err) {
                return {aired: false};
            }
        }
        return {aired: false};
    }

    /**
     * Returns whether or not this anime is missing the latest airing data.
     * @returns {Boolean} if this anime is missing the latest airing data
     */
    isMissingAiringData() {
        return this.nextAiringEpisode === null ||
            this.nextAiringEpisode.episode === null ||
            this.nextAiringEpisode.airingAt === null;
    }

    /**
     * Returns whether or not this anime's latest episode has aired based on our info.
     * @returns {Boolean} if this anime's latest episode has aired
     */
    hasAired() {
        return this.nextAiringEpisode && tool.getUnixTime() > this.nextAiringEpisode.airingAt;
    }

    /**
     * Returns whether or not this anime is updatable. Being updatable means that the anime is either currently airing
     * or confirmed to be airing.
     * @returns {Boolean} if this anime is updatable.
     */
    isAiring() {
        return this.status === AiringAnime.MediaStatus.RELEASING || this.status === AiringAnime
            .MediaStatus.NOT_YET_RELEASED;
    }
}

module.exports = AiringAnime;
