const mongoose = require('mongoose');

// Schema for Anilist users.
let anilistUsersSchema = new mongoose.Schema({ discordUserId: Number, anilistUserId: Number });
let AnilistUsers = mongoose.model('anilistUser', anilistUsersSchema);

// Schema mapping Anilist anime ids to the Discord ids of users who are subscribed to notifications for that anime.
let airingSubscribersSchema = new mongoose.Schema({ animeId: Number, discordUserIds: Array});
let AiringSubscribers = mongoose.model('airingSubscriber', airingSubscribersSchema);

// Guild schema.
let guildSchema = new mongoose.Schema({ guildId: Number, sars: Array });
let Guilds = mongoose.model('guild', guildSchema);

module.exports = {
    AnilistUsers,
    AiringSubscribers,
    Guilds
}
