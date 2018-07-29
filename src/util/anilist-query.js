const stripIndent = require('strip-indent');

const anilistQueries = {
    GET_AIRING_LIST: stripIndent(
        `
        query ($username: String) {
          MediaListCollection(userName: $username, type:ANIME) {
            statusLists{
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
    ),

    GET_ANILIST_USER_ID: stripIndent(
        `
        query ($username: String) {
          User(name: $username) {
            id
          }
        }
        `
    ),

    GET_ANILIST_USER: stripIndent(
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
    )
}

module.exports = anilistQueries;
