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
            `${tool.inaBaka}`,
            'dummy'
        ];
        return nouns[tool.randint(nouns.length)];
    },

    inaAngry: '<:inaAngry:302886932164116480>',
    inaBaka: '<:inaBaka:301529550783774721>',
    inaError: '<:inaError:338904821299937282>',
    inaHappy: '<:inaHappy:301529610754195456>'
}
