const sprintf = require('sprintf-js').sprintf;

module.exports = {
    /*
    Generates a random integer from 0 to upper exclusive.
    @param {Number} upper The upper bound of the random integer.
    @return {Number} A random integer from 0 to upper exclusive.
    */
    randInt(upper) {
        return Math.floor(Math.random() * (upper));
    },

    /*
    Checks if value is an integer.
    @param value Value to check.
    @return true if integer, false otherwise
    */
    isInt(value) { //Written by krisk.
        let x = parseFloat(value);
        return !isNaN(value) && (x | 0) === x;
    },

    /*
    Wraps the content in an unformatted text box.
    @param {String} content The content to wrap.
    @return The wrapped content.
    */
    wrap(content) {
        return '``' + content + '``';
    },

    /*
    Returns a random tsundere noun.
    @return A random tsundere noun.
    */
    tsunNoun() {
        const nouns = [
            'b-baka',
            's-stupid',
            'd-dummy',
            'baaaka',
            `${this.inaBaka}`,
            'dummy'
        ];
        return nouns[this.randInt(nouns.length)];
    },

    /*
    Parses '--' (long) and '-' (short) options for command strings.
    @param {String} commandString The command to parse options from.
    @return An object with fields corresponding to the parsed options.
    */
    parseOptions(commandString) {
        let matches;
        let shortRegex = / -(\w+)/g;
        let longRegex = / --(\w+)/g;

        let options = {};
        while ((matches = shortRegex.exec(commandString))) {
            if (matches[1].indexOf('--') === -1) {
                //Parse combined short args. ex: '-abc' where a, b, c are options.
                for (let i = 0; i < matches[1].length; i++) {
                    options[matches[1][i]] = true;
                }
            }
        }
        while ((matches = longRegex.exec(commandString))) {
            options[matches[1]] = true;
        }

        return options;
    },

    /*
    Parse the argument for the specified option from commandString.
    @param {String} option The option to parse the argument for.
    @param {String} commandString The command to search.
    @return The argument for the specified option, or null if the arg couldn't be found.
    */
    parseOptionArg(option, commandString) {
        let regex = new RegExp(`--${option} (.+)`);

        let matchArg = commandString.match(regex);
        if (matchArg) {
            return matchArg[1].slice(0, this.getNextArgIndex(matchArg[1])).trim().toLowerCase();
        } else {
            return null;
        }
    },

    /*
    Gets the index of the next argument/option. Usually used to ignore off that argument.
    If next argument does not exist, index = argString.length.
    @param {String} argString The string to check.
    @return {Number} The index of the next argument, or as above if the arg does not exist.
    */
    getNextArgIndex(argString) {
        let nextArgIndex = argString.indexOf('-');
        return nextArgIndex === -1 ? argString.length : nextArgIndex;
    },

    /*
    Returns the current unix time in seconds.
    @return {Number} the unix time in seconds.
    */
    getUnixTime() {
        return Math.round((new Date()).getTime() / 1000);
    },

    /*
    Formats time in seconds to minutes:seconds.
    */
    formatTime(seconds) {
        return seconds !== 'N/A' ? `${Math.floor(seconds/60)}:${sprintf('%02d', seconds % 60)}` :
            'N/A';
    },

    /*
    Shuffles the given array, returning it.
    */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            let e = this.randInt(i + 1);
            let t = array[i];
            array[i] = array[e];
            array[e] = t;
        }
        return array;
    },

    /*
    Disord emojis.
    */
    inaAngry: '<:inaAngry:410197799666450473>',
    inaBaka: '<:inaBaka:410197799666450473>',
    inaHappy: '<:inaHappy:410197799666450473>'
}
