const util = require('../../util/util.js');

/**
 * A currently airing anime.
 */
class AiringAnime {
    constructor({ id, name, synonyms, airingInfo }) {
        this.id = id;
        this.name = name;
        this.synonyms = synonyms;
        this.nextEpisode = airingInfo[0].episode;
        this.airingInfo = airingInfo;
        this.lastUpdated = util.getUnixTime();
    }

    /**
     * Updates the airing info of this anime.
     * @param {Array<Object>} airingInfo The updated airing info. [{ episode: Number, airingAt: Number }, ...]
     */
    updateAiringInfo(airingInfo) {
        if (airingInfo.length) {
            this.nextEpisode = airingInfo[0].episode || this.nextEpisode;
            this.airingInfo = airingInfo || this.airingInfo;
            this.lastUpdated = util.getUnixTime();
        }
    }

    /**
     * Called when the episode airs.
     */
    onAir() {
        this.nextEpisode++;
        this.lastUpdated = util.getUnixTime();
    }

    /**
     * Returns whether or not this anime's latest episode has aired based on the nextAiringEpisode time.
     * @returns {Boolean} if this anime's latest episode has aired
     */
    hasAired() {
        const nextEpisodeData = this.airingInfo.find((data) => data.episode === this.nextEpisode);
        return nextEpisodeData ? util.getUnixTime() > nextEpisodeData.airingAt : false;
    }
}

module.exports = AiringAnime;
