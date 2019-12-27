const sprintf = require('sprintf-js').sprintf;
const config = require('../config.json');

module.exports = {
    /**
     * Generates a random integer from 0 to upper exclusive.
     * @param {Number} upper The upper bound of the random integer.
     * @returns {Number} A random integer from 0 to upper exclusive.
     */
    randInt(upper) {
        return Math.floor(Math.random() * (upper));
    },

    /**
     * Checks if value is an integer.
     * @param value Value to check.
     * @return {Boolean} true if integer, false otherwise
     */
    isInt(value) { //Written by krisk.
        let x = parseFloat(value);
        return !isNaN(value) && (x | 0) === x;
    },

    /**
     * Wraps the content with the supplied string.
     * @param {String} content The content to wrap.
     * @param {String} wrapper The wrapper.
     * @return {String} The wrapped content.
     */
    wrap(content, wrapper = '``') {
        return wrapper + content + wrapper;
    },

    /**
     * Returns a random tsundere noun.
     * @return {String} A random tsundere noun.
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
     * Parses '--' (long) and '-' (short) options for command strings.
     * @param {String} commandString The command to parse options from.
     * @return {Object} The parsed options.
     */
    parseOptions(commandString) {
        let matches;
        const shortRegex = / -(\w)/g;
        const longRegex = / --(\w{2,})/g;

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
     * Parse the argument for the specified option from commandString.
     * @param {String} option The option to parse the argument for.
     * @param {String} commandString The command to search.
     * @return {String} The argument for the specified option, or true if the arg couldn't be found.
     */
    parseOptionArg(option, commandString) {
        const matchArg = commandString.match(new RegExp(`-${option} #?([\\w,]+)`));
        return matchArg ? matchArg[1].trim().toLowerCase() : true;
    },

    /**
     * Removes the given options from the command string. Used to get the pure arguments of the command.
     * @param {String} commandString The command to remove strings from.
     * @return {String} The cleaned command string. 
     */
    removeOptions(commandString, options) {
        for (const [option, value] of Object.entries(options)) {
            if (option.length === 1) {
                commandString = value === true ?
                    commandString.replace(new RegExp(`\\s+-${option}`), '') :
                    commandString.replace(new RegExp(`\\s+-${option}\\s+${value}`), '');
            } else {
                commandString = value === true ?
                    commandString.replace(new RegExp(`\\s+--${option}`), '') :
                    commandString.replace(new RegExp(`\\s+--${option}\\s+${value}`), '');
            }
        }
        return commandString;
    },

    /***
     * Returns the current unix time in seconds.
     * @return {Number} the unix time in seconds.
     */
    getUnixTime() {
        return Math.round((new Date()).getTime() / 1000);
    },

    /**
     * Formats time in seconds to minutes:seconds.
     * @param {Number} seconds the time in seconds.
     * @return {String} the time in minutes:seconds.
     */
    formatTime(seconds) {
        return seconds !== 'N/A' ?
            `${Math.floor(seconds / 60)}:${sprintf('%02d', seconds % 60)}` :
            'N/A';
    },

    /**
     * Shuffles the given array, returning it.
     * @param {Array} array the array
     * @return {Array} the shuffled array.
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

    /**
     * Check for string equality ignoring case.
     * @return {Boolean}
     */
    stringEqualsIgnoreCase(string1, string2) {
        return string1 && string2 && string1.toLowerCase() === string2.toLowerCase();
    },

    /**
     * Returns a formatted string to represent a command.
     * @param {String} cmdStr The command string.
     */
    commandString(cmdStr) {
        return `${this.wrap(`${config.prefix}${cmdStr}`)}`;
    }
};
