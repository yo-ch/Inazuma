const sprintf = require('sprintf-js').sprintf;

module.exports = {
    /**
     *Generates a random integer from 0 to upper exclusive.
     *@param {Number} upper The upper bound of the random integer.
     *@returns {Number} A random integer from 0 to upper exclusive.
     */
    randInt(upper) {
        return Math.floor(Math.random() * (upper));
    },

    /**
     *Checks if value is an integer.
     *@param value Value to check.
     *@return {Boolean} true if integer, false otherwise
     */
    isInt(value) { //Written by krisk.
        let x = parseFloat(value);
        return !isNaN(value) && (x | 0) === x;
    },

    /**
     *Wraps the content in an unformatted text box.
     *@param {String} content The content to wrap.
     *@return {String} The wrapped content.
     */
    wrap(content) {
        return '``' + content + '``';
    },

    /**
     *Returns a random tsundere noun.
     *@return {String} A random tsundere noun.
     */
    tsunNoun() {
        const nouns = [
            'b-baka',
            's-stupid',
            'd-dummy',
            'baaaka',
            'dummy'
        ];
        return nouns[this.randInt(nouns.length)];
    },

    /**
     *Parses '--' (long) and '-' (short) options for command strings.
     *@param {String} commandString The command to parse options from.
     *@return {Object} The parsed options.
     */
    parseOptions(commandString) {
        let matches;
        let shortRegex = / -(\w+)/g;
        let longRegex = / --(\w+)/g;

        let options = {};
        while ((matches = shortRegex.exec(commandString))) {
            options[matches[1]] = this.parseOptionArg(matches[1], commandString);
        }
        while ((matches = longRegex.exec(commandString))) {
            options[matches[1]] = this.parseOptionArg(matches[1], commandString);
        }

        return options;
    },

    /**
     *Parse the argument for the specified option from commandString.
     *@param {String} option The option to parse the argument for.
     *@param {String} commandString The command to search.
     *@return The argument for the specified option, or null if the arg couldn't be found.
     */
    parseOptionArg(option, commandString) {
        let regex = new RegExp(`-${option} #?([\\w,]+)`);

        let matchArg = commandString.match(regex);
        if (matchArg) {
            return matchArg[1].trim().toLowerCase();
        } else {
            return null;
        }
    },

    /***
     *Returns the current unix time in seconds.
     *@return {Number} the unix time in seconds.
     */
    getUnixTime() {
        return Math.round((new Date()).getTime() / 1000);
    },

    /**
     *Formats time in seconds to minutes:seconds.
     *@param seconds the time in seconds.
     *@return the time in minutes:seconds.
     */
    formatTime(seconds) {
        return seconds !== 'N/A' ? `${Math.floor(seconds/60)}:${sprintf('%02d', seconds % 60)}` :
            'N/A';
    },

    /**
     * Shuffles the given array, returning it.
     *@param array the array
     *@return the shuffled array.
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            let e = this.randInt(i + 1);
            let t = array[i];
            array[i] = array[e];
            array[e] = t;
        }
        return array;
    }
}
