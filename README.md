# Inazuma Bot

A personal Discord bot written using discord.js.

Includes anime lookup (Anilist) and a music player.

# Commands

```
~help [command]
    Brings up the command page. Pass a command for further information.
```

```
[] = optional, <> = required, | = or
```

<h3> Utility </h3>

```
~airing [option]   
    Displays countdowns until the next episode for each anime in the airing list.  
    
    Options:       a <anilist urls>      : Adds the given anime to the airing list.      
                   r <name in list>      : Removes the anime from the airing list.     
                   c                     : Clears the airing list.

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

<h3> Music </h3>

```
~music | ~m <option>
   Options:       p | play <url>  : Adds the song to the queue.
                  s | skip        : Skips the current song.
                  q | queue       : Displays the song queue.
                  v | vol <0-100> : Sets volume.
       
   Supports all sites that youtube-dl supports.
   Requires a #music text channel.
```

<h3> Etc. </h3>

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
<h3> config.json</h3>

```
{
    "token": "Discord Token",
    "prefix": "~",
    "imgur_id": "Imgur ID",
    "anilist_id": "Anilist ID",
    "anilist_secret": "Anilist Secret",
    "anilist_token": "temp",
    "anilist_token_expires_in": 0
}
```

<h3> airing_anime.json </h3>

```
{
    "anime": []
}
```

<h3> gavquotes.json </h3>

```
{
    "quotes": [
    "Quote 1", 
    "Quote 2" ]
}
```



