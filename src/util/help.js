module.exports = {
   pluginDescriptions: {
      core: `Core bot commands.`,
      anime: `Anime related commands.`,
      music: `Music streaming commands.`,
      insidejokes: `Inside jokes.`,
   },

   commandDescriptions: {
      // Core commands.
      help: `Brings up a help page for a command plugin.`,
      usage: `Brings up a usage page for a specific command.`,
      choose: `Randomly chooses between the provided choices.`,
      roll: `Rolls a random number.`,

      // Anime commands.
      anime: `Anime database search.`,
      airing: `Anime episode airing notifications.`,
      weebify: `Translates sentences from English to Japanese.`,
      weeb: `Tags a weeb.`,

      // Music commands.
      play: `Queue a song up.`,
      skip: `Skip the current song.`,
      pause: `Pause the current song.`,
      resume: `Unpause the current song.`,
      volume: `Change the volume.`,
      np: `Now playing information.`,
      queue: `Display the song queue.`,
      purge: `Clear the song queue.`,
      shuffle: `Shuffle the song queue.`,
      join: `Summons Inazuma to your voice channel.`,
      leave: `Unsummons Inazuma.`,

      // Inside joke commands.
      andy: `Shut up weeb.`,
      gavquote: `Returns a random Gavin quote.`,

      prune: `Prunes messages in the channel it was used in.`,
      role: `Role management functions.`,
      ban: `Bans the mentioned user.`,
      kick: `Kicks the mentioned user.`,
      sar: `Self assignable roles interface`,
      roleme: `Assign/deassign self assignable roles from yourself.`
   },

   commandUsages: {
      /**
       * Core commands.
       */
      help: `[plugin]
   Brings up the plugin help page. Pass a plugin for a list of its commands.`,

      usage: `<command>
   Brings up the command help page.

   [] = optional, <> = required
   `,

      choose: `<arg1> | [arg2] ...
   Randomly chooses between the provided choice(s).`,

      roll: `<int1> [int2]
   Rolls an integer from 1 to int1 inclusive.
   If int2 is given, rolls an integer between int1 and int2 inclusive.`,


      /**
       * Anime commands.
       */
      anime: `<query>
   Displays an anime's data, pulled from Anilist.
   If multiple choices are given, simply reply with the number.`,

      airing: `[function]
   Interface to get airing notifications for current season anime (Japan times). 

   Functions:
      sync [anilist name]
         Sync your Anilist to your airing list to get notifications
         for all current season anime on your list.

         Name is only required the first time.

      subscribe <link> | <name>
         Subscribe to notifications for the given anime.

      unsubscribe <link> | <name> 
         Unsubscribe to notifications for the given anime.

      list
         Lists all the anime you're subscribed to notifications for.`,

      weebify: `<sentence>
   Translates a sentence from English to Japanese.`,

      weeb: `@mention
   Tags a weeb with a picture.`,


      /**
       * Music commands.
       */
      play: `<url> | yt <query>
   Adds a song/playlist to the queue.
   
   E.g:
   play https://www.youtube.com/watch?v=cJ6Uakis588
   play yt Freedom Dive`,

      skip: `
   Skips the current song.`,

      pause: `
   Pauses the current song.`,

      resume: `
   Unpauses the current song.`,

      shuffle: `
   Shuffles the song queue.`,

      queue: `
   Displays the song queue.`,

      purge: `
   Clears the song queue.`,

      np: `
   Displays information for the current song.`,

      vol: `<0-100>
   Sets the volume of the music player.`,

      join: `
   Summons Inazuma to your voice channel.`,

      leave: `
   Unsummons Inazuma.`,

      /**
       * Inside joke commands.
       */
      andy: `[mention]
   Shut up weeb. Mentions user, if included.`,

      gavquote: `
   Returns a random Gavin quote.`,




      cc: `
cc <voice channel> <mention>
   Changes the mentioned user's voice channel to the given channel.`,

      prune: `
prune <amount> [options]
   Prunes the last <amount> messages.

   Options:
      [--bots]            : Only prunes bot messages.
      [--user <name>]     : Only prunes messages by the specified user.
      [--filter <string>] : Only prunes messages with the specified string.

      [--pinned | -p]     : Also prunes pinned messages.
      [--silent | -s]     : Deletes command and doesn't display results.`,

      role: `[Role Help]

role give <role[,...]> [options] : Gives role(s).
role take <role[,...]> [options] : Removes role(s).
   [--bots]              : Only change roles for bots.
   [--users]             : Only change roles for users.
   [--user <user[,...]>] : Only change roles for specified users.

   [--inrole <role>]     : Change roles for everyone with the role.
   [--notinrole <role>]  : Change roles for everyone without the role.
   [--noroles]           : Change roles for everyone with no roles.

role modify <role> [options] : Modifies a role.
   [--name <name>]       : Rename role.
   [--color <color>]     : Change role color. (6 digit HEX)`,





      ban: `
ban <mention> [options]
   Bans the mentioned user.
   You cannot ban users in a role higher than Inazuma or yourself.

   Options:
      [--days <number>]   : Deletes the message history of the user.
      [--reason <reason>] : Specifies a reason for banning the user.`,

      kick: `
kick <mention> [options]
   Kicks the mentioned user.
   You cannot kick users in a role higher than Inazuma or yourself.

   Options:
      [--reason <reason>] : Specifies a reason for kicking the user.`,


      sar: `
sar <function>
   add <role name>    : Add this SAR to the server.
   remove <role name> : Remove this SAR from the server.
   list               : List all SARs on this server.

   The self assignable roles interface.
   Use ~roleme <SAR> to self assign roles.`,

      'roleme': `
roleme <SAR>
  Assign/deassign self assignable roles from yourself.`
   }
};
