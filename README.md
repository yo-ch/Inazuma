# Inazuma Bot

A personal Discord bot written using discord.js.

Includes anime lookup and a music player.

# Commands

```
~help [command]
    Brings up the command page. Pass a command for further information.
```

```
[] = optional, <> = required
```

<h3> Utility </h3>

```
~airing [option]   
    Displays the countdowns for anime in the airing list.  
    
    Options:       a <anilist anime url> : Adds the given anime to the airing list.      
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
```

<h3> Etc. </h3>

```
~andy [@mention]   
    Shut up weeb. Mentions user, if included.

~gavquote
    Returns a random Gavin quote.

~vigne   
    Returns a random picture of Vigne.
```

```
~cc <voice channel> <@mention>
    Changes the mentioned user's voice channel to the given channel.
```



