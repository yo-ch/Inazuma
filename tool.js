module.exports = {
    /*
    Generates a random integer from 0 to upper exclusive.
    */
    randint(upper) {
        return Math.floor(Math.random() * (upper));
    },

    isInt(value) { //Written by krisk.
        var x = parseFloat(value);
        return !isNaN(value) && (x | 0) === x;
    },

    /*
    Wraps the content in an unformatted text box.
    */
    wrap(content) {
        return '``' + content + '``';
    },

    /*
    Returns a random tsundere noun.
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
        return nouns[this.randint(nouns.length)];
    },

    /*
    Parses '--' (long) and '-' (short) arguments for command strings.
    */
    parseOptions(argString) {
        var matches;
        var shortRegex = / -(\w+)/g;
        var longRegex = / --(\w+)/g;
        var shortOpts = [];
        var longOpts = [];
        while (matches = shortRegex.exec(argString)) {
            if (matches.input.indexOf('--') == -1) {
                if (matches[1].length > 1) { //Parse combined short args. ex: '-abc' where a, b, c are options.
                    for (let i = 0; i < matches[1].length; i++) {
                        shortOpts.push(matches[1][i]);
                    }
                } else {
                    shortOpts.push(matches[1]);
                }
            }
        }
        while (matches = longRegex.exec(argString)) {
            longOpts.push(matches[1]);
        }
        return {
            short: shortOpts,
            long: longOpts
        };
    },

    /*
    Gets the index of the next argument/option. Usually used to chop off that argument.
    If next argument does not exist, index = argString.length.
    */
    getNextArgIndex(argString) {
        var nextArgIndex = argString.indexOf('-');
        return nextArgIndex == -1 ? argString.length : nextArgIndex;
    },

    inaAngry: '<:inaAngry:302886932164116480>',
    inaBaka: '<:inaBaka:301529550783774721>',
    inaError: '<:inaError:338904821299937282>',
    inaHappy: '<:inaHappy:301529610754195456>'
}
