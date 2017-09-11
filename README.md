# Inazuma Bot

A personal Discord bot written using discord.js.

Includes anime lookup (Anilist) and a music player.

```
indev:
    ~airing command rework
    migration to Anilist api v2 (graphql)

planned:
    Soundcloud music when API registration opens back up.
    More moderation tools.
    Message embeds for current commands.
```

# Commands

```
~help [command]
    Brings up the command page. Pass a command for further information.
```

```
[] = optional, <> = required, | = or
```

## Utility

```
~airing [function]   
    Displays the time until the next episode airs for each anime in your airing list.  

    Functions:
        add <url[,...]>         : Adds the given anime to your airing list.     
        remove <name in list>   : Removes the anime from your airing list.     
        clear                   : Clears your airing list.
        sync <anilist username> : Sync your Anilist anime list with your airing list.

    URLs should link to an anime page on Anilist.

~anilist | ~ani <anime name>   
    Displays an anime's data, pulled from Anilist.
    If multiple choices are given, simply reply with the number.
```

```
~choose <arg1> | [arg2] ...
    Randomly chooses between the provided choice(s).

~roll <int1> [int2]   
    Rolls an integer from 1 to int1 inclusive.
    If int2 is given, rolls an integer between int1 and int2 inclusive.
```

## Music

```
~music <command>:
    play <url> | <search> : Adds the song/playlist to the queue.
    skip                  : Skips the current song.
    pause                 : Pauses the song.
    resume                : Resumes the song.

    queue                 : Displays the song queue.
    purge                 : Clears the song queue.
    np                    : Displays the title of the current song.

    vol <0-100>           : Sets volume.

    join                  : Joins your voice channel.
    leave                 : Leaves voice channel.

Supports Youtube and search.
Requires a #music text channel.
```

## Moderation

```
~ban <@mention> [options]
    Bans the mentioned user.
    You cannot ban users in a role higher than Inazuma or yourself.

    Options:
        [--days <number>]   : Deletes the message history of the user.
        [--reason <reason>] : Specifies a reason for banning the user.

~kick <@mention> [options]
    Kicks the mentioned user.
    You cannot kick users in a role higher than Inazuma or yourself.

    Options:
        [--reason <reason>] : Specifies a reason for kicking the user.
```

```
~prune <amount> [options]
    Prunes the last <amount> messages.

    Options:
        [--bots]            : Only prunes bot messages.
        [--user <name>]     : Only prunes messages by the specified user.
        [--filter <string>] : Only prunes messages with the specified string.

        [--pinned | -p]     : Also prunes pinned messages. (They are not pruned by default.)
        [--silent | -s]     : Deletes the command and does not display results of prune.
```

```
~role give <role[role,...]>   : Gives role(s).
~role take <role[role,...]>   : Removes role(s).
~role modify <role>           : Modifies a role.

Options:
    give|take:
        [--all]               : Changes roles for everyone.
        [--bots]              : Only change roles for bots.
        [--users]             : Only change roles for users.
        [--user <user[,...]>] : Only change roles for specified users.

        [--inrole <role>]     : Change roles for everyone with the role.
        [--notinrole <role>]  : Change roles for everyone without the role.
        [--noroles]           : Change roles for everyone with no roles.

    modify:
        [--name <name>]       : Rename role.
        [--color <color>]     : Change role color. (6 digit HEX)
```

```
~cc <voice channel> <@mention>
    Changes the mentioned user's voice channel to the given channel.
```

## Etc.

```
~andy [@mention]   
    Shut up weeb. Mentions user, if included.

~gavquote
    Returns a random Gavin quote.
```

```
~aoba
    Returns a random picture of Aoba.

~vigne   
    Returns a random picture of Vigne.
```

# JSON Sample Files

## config.json

```
{
    "token": "Discord Token",
    "prefix": "~",
    "imgur_id": "Imgur ID",
    "anilist_id": "Anilist ID",
    "anilist_secret": "Anilist Secret",
    "youtube_api_key": "Youtube API Key"
}
```

## airing_anime.json

```
{
    "User1ID": [],
    "User2ID": [],
    ...
}
```

## gavquotes.json

```
{
    "quotes": [
    "Quote 1",
    "Quote 2" ]
}
```
