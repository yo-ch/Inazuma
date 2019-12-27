const mongoose = require('mongoose');

// Schema for Anilist users.
const anilistUsersSchema = new mongoose.Schema({ discordUserId: Number, anilistUserId: Number });
const AnilistUsers = mongoose.model('anilistUser', anilistUsersSchema);

// Schema mapping Anilist anime ids to the Discord ids of users who are subscribed to notifications for that anime.
const airingSubscribersSchema = new mongoose.Schema({ animeId: Number, discordUsers: Array});
const AiringSubscribers = mongoose.model('airingSubscriber', airingSubscribersSchema);

// Guild schema.
const guildSchema = new mongoose.Schema({ guildId: Number, sars: Array });
const Guilds = mongoose.model('guild', guildSchema);

module.exports = {
    AnilistUsers,
    AiringSubscribers,
    Guilds
};
