/*
 * A utility/API wrapper module to query Anilist GraphQL API endpoints.
 */

const stripIndent = require('strip-indent');
const rp = require('request-promise');

/**
 * Returns the current anime season.
 * @return {Object} An object with a season and year property.
 */
function getCurrentSeason() {
    const date = new Date();
    const month = date.getMonth();
    const year = date.getFullYear();

    let season;
    if (0 <= month && month <= 2) {
        season = 'WINTER';
    } else if (3 <= month && month <= 5) {
        season = 'SPRING';
    } else if (6 <= month && month <= 8) {
        season = 'SUMMER';
    } else if (9 <= month && month <= 11) {
        season = 'FALL';
    }

    return {
        season: season,
        seasonYear: year
    };
}

function queryAnilist(query, variables) {
    const options = {
        method: 'POST',
        url: 'https://graphql.anilist.co/',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ query, variables })
    };
    return rp(options)
        .then((body) => JSON.parse(body).data)
        .catch((err) => JSON.parse(err));
}

function getUserId(username) {
    const queryString = stripIndent(
        `
        query ($username: String) {
            User(name: $username) {
                id
            }
        }
        `
    );

    return queryAnilist(queryString, { username }).then((json) => json.User.id);
}

function getUserInfo(anilistId) {
    const queryString = stripIndent(
        `
        query ($anilistId: Int) {
            User(id: $anilistId) {
                id
                name
                avatar {
                    medium
                }
                stats {
                    watchedTime
                    chaptersRead
                }
                siteUrl
            }
        }
        `
    );

    return queryAnilist(queryString, { anilistId }).then((json) => json.User);
}

function getUserWatchingLists(anilistId) {
    const queryString = stripIndent(
        `
        query ($anilistId: Int) {
            MediaListCollection(userId: $anilistId, status: CURRENT, type: ANIME) {
                lists {
                    name
                    entries {
                        media {
                            id 
                            title {
                                romaji
                            }
                            status
                        }
                    }
                }
            }
        }
        `
    );

    return queryAnilist(queryString, { anilistId }).then((json) => json.MediaListCollection.lists);
}

function getAnimeInfo(anime) {
    const queryString = stripIndent(
        `
        query ($anime: String) {
            Page (page: 1, perPage: 20) {
                media (search: $anime, type: ANIME) {
                    id
                    title {
                        romaji
                    }
                    seasonInt
                    description
                    format
                    episodes
                    averageScore
                    coverImage {
                        medium
                    }
                    genres
                }
            }
        }
        `
    );

    return queryAnilist(queryString, { anime }).then((json) => json.Page.media);
}

function getAnimeAiringInfo(id) {
    const queryString = stripIndent(
        `
        query ($id: Int) {
            Media(id: $id, type: ANIME) {
                id
                status
                nextAiringEpisode {
                    airingAt
                    episode
                }
            }
        }
        `
    );

    return queryAnilist(queryString, { id }).then((json) => json.Media);
}

function getSeasonAiringInfo() {
    const queryString = stripIndent(
        `
        query ($season: MediaSeason, $seasonYear: Int) {
            Page (page: 1, perPage: 50) {
                media (type: ANIME, format: TV, season: $season, seasonYear: $seasonYear) {
                    id
                    status
                    title {
                        romaji
                        english
                        native
                    }
                    synonyms
                    airingSchedule(notYetAired: true) {
                        nodes {
                            airingAt
                            episode
                        }
                    }
                }
            }
        }
        `
    );
    const seasonInfo = getCurrentSeason();

    return queryAnilist(queryString, seasonInfo).then((json) => json.Page.media);
}

module.exports = {
    getUserId,
    getUserInfo,
    getUserWatchingLists,
    getAnimeInfo,
    getAnimeAiringInfo,
    getSeasonAiringInfo
};
