/*
 * A utility/API wrapper module to query Anilist GraphQL API endpoints.
 */

const stripIndent = require('strip-indent');
const rp = require('request-promise');
const tool = require('./tool.js');

/**
 *Returns the current anime season.
 *@return {Object} An object with a season and year property.
 */
function getCurrentSeason() {
    let date = new Date();
    let month = date.getMonth();
    let year = date.getFullYear();

    let season;
    if (0 <= month && month <= 2)
        season = 'WINTER';
    else if (3 <= month && month <= 5)
        season = 'SPRING';
    else if (6 <= month && month <= 8)
        season = 'SUMMER';
    else if (9 <= month && month <= 11)
        season = 'FALL';

    return {
        season: season,
        seasonYear: year
    };
}

function queryAnilist(query, variables) {
    let options = {
        method: 'POST',
        url: `https://graphql.anilist.co/`,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    }
    return rp(options).then(body => JSON.parse(body).data);
}

function getUserAiringList(userId) {
    const GET_USER_AIRING_LIST = stripIndent(
        `
        query ($userId: Int) {
          MediaListCollection(userId: $userId, type:ANIME) {
            statusLists {
              media {
                id
                status
                title {
                  romaji
                  english
                }
                nextAiringEpisode {
                  episode
                }
                airingSchedule{
                  nodes{
                    airingAt
                    episode
                  }
                }
              }
            }
          }
        }
        `
    );

    return queryAnilist(GET_USER_AIRING_LIST, { userId });
}

function getAnilistUserId(username) {
    const GET_ANILIST_USER_ID = stripIndent(
        `
            query ($username: String) {
              User(name: $username) {
                id
              }
            }
            `
    );

    return queryAnilist(GET_ANILIST_USER_ID, { username });
}

function getAnilistUserInfo(username) {
    const GET_ANILIST_USER_INFO = stripIndent(
        `
          query ($username: String) {
            User(name: $username) {
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

    return queryAnilist(GET_ANILIST_USER_INFO, { username });
}

function getAnimeInfo(anime) {
    const GET_ANIME_INFO = stripIndent(
        `
        query ($anime: String) {
          Page (page: 1, perPage: 20) {
            media (search: $anime, type: ANIME) {
              id
              title {
                romaji
              }
              season
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

    return queryAnilist(GET_ANIME_INFO, { anime });
}

function getAiringData(id) {
    const GET_AIRING_ANIME_SCHEDULE = stripIndent(
        `
          query ($id: Int, $page: Int) {
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

    return queryAnilist(GET_AIRING_ANIME_SCHEDULE, { id });
}

function getSeasonAiringData() {
    const GET_AIRING_ANIME_SCHEDULES = stripIndent(
        `
        query ($season: MediaSeason, $seasonYear: Int) {
          Page (page: $page, perPage: 50) {
            media (type: ANIME, format: TV, season: $season, seasonYear: $seasonYear)
              id
              status
              title {
                romaji
              }
              episodes
              nextAiringEpisode {
                airingAt
                episode
              }
          }
        }
      `
    );

    let seasonInfo = getCurrentSeason();

    return queryAnilist(GET_AIRING_ANIME_SCHEDULES, seasonInfo);
}

module.exports = {
    getUserAiringList,
    getAnilistUserId,
    getAnilistUserInfo,
    getAnimeInfo,
    getAiringData,
    getSeasonAiringData
};
