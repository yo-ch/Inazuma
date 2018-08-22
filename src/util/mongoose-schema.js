const mongoose = require('mongoose');

// Guild schema.
let guildSchema = new mongoose.Schema({ guildId: Number, sars: Array });
let Guilds = mongoose.model('guild', guildSchema);

// Schema for Anilist users.
let anilistUsersSchema = new mongoose.Schema({ discordUserId: Number, anilistUserId: Number });
let AnilistUsers = mongoose.model('anilistUser', anilistUsersSchema);

module.exports = {
    AnilistUsers,
    Guilds
}
