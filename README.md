# Inazuma Bot

A personal Discord bot written using discord.js.

Includes anime lookup (Anilist) and a music player.

```
Planned:
    Soundcloud music when API registration opens back up.
    Airing list notifications.
    Moderation tools.
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
~airing [option]   
    Displays countdowns until the next episode for each anime in your airing list.  

    Options:   a <anilist urls> : Adds the given anime to your airing list.      
               r <name in list> : Removes the anime from your airing list.     
               c                : Clears your airing list.

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

```
~cc <voice channel> <@mention>
    Changes the mentioned user's voice channel to the given channel.
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
