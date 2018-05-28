# Inazuma Bot

A Discord bot written using discord.js.

Includes anime lookup (Anilist) and a music player.

```
indev:

planned:
    -DB implementation for airing list.
    -Self assignable roles.
    -Strawpoll functionality.
    -Soundcloud music when API registration opens back up. i.e; never
```

# Commands

```
~help [command]
    Brings up the command page. Pass a command for further information.
```

```
[] = optional, <> = required, | = or
```

## Anime

```
~airing [function]   
    Displays your airing list.

    Functions:
        sync [anilist username] : Sync your Anilist anime list with your airing list.
                                      You only need to include your username the first time.
                                      This only syncs to be aired/airing anime.
        clear                   : Clears your airing list.
        notifications <on|off>  : Sets airing notifications on/off. (On by default).

The airing list shows the time until the next episode airs for each anime in your list.
Airing notifications are sent to subscribed users when an anime airs.  

~anilist | ~ani <anime name>   
    Displays an anime's data, pulled from Anilist.
    If multiple choices are given, simply reply with the number.
```

## Music

```
~music <command>:
    play <url> | <search> : Adds the song/playlist to the queue.
    skip                  : Skips the current song.
    pause                 : Pauses the song.
    resume                : Resumes the song.
    shuffle               : Shuffles the queue.

    queue                 : Displays the song queue.
    purge                 : Clears the song queue.
    np                    : Displays the title of the current song.

    vol <0-100>           : Sets volume.

    join                  : Joins your voice channel.
    leave                 : Leaves voice channel.

Supports Youtube and search.
```

## Utility

```
~choose <arg1> | [arg2] ...
    Randomly chooses between the provided choice(s).

~roll <int1> [int2]   
    Rolls an integer from 1 to int1 inclusive.
    If int2 is given, rolls an integer between int1 and int2 inclusive.
```

```
~weebify <sentence>
    Translates a sentence from English to Japanese.`
```

## Guild/Moderation

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
~role give <role[role,...]> [options]   : Gives role(s).
~role take <role[role,...]> [options]   : Removes role(s).
    [--all]               : Changes roles for everyone.
    [--bots]              : Only change roles for bots.
    [--users]             : Only change roles for users.
    [--user <user[,...]>] : Only change roles for specified users.

    [--inrole <role>]     : Change roles for everyone with the role.
    [--notinrole <role>]  : Change roles for everyone without the role.
    [--noroles]           : Change roles for everyone with no roles.

~role modify <role> [options]           : Modifies a role.
    [--name <name>]       : Rename role.
    [--color <color>]     : Change role color. (6 digit HEX)
```

```
~sar <function>
    add <role name>    : Add this SAR to the server.
    remove <role name> : Remove this SAR from the server.
    list               : List all SARs on this server.

The self assignable roles interface.
Use ~roleme <SAR> to self assign roles.

~roleme <SAR>
    Assign/deassign self assignable roles from yourself.`
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
