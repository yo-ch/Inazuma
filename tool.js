module.exports = {
    /*
    Generates a random integer from 0 to upper exclusive.
    */
    randint: function(upper) {
        return Math.floor(Math.random() * (upper));
    },

    isInt: function(value) { //Written by krisk.
        var x = parseFloat(value);
        return !isNaN(value) && (x | 0) === x;
    },

    /*
    Wraps the content in a unformatted text box.
    */
    wrap: function(content) {
        return '``' + content + '``';
    },

    inaBaka: '<:inaBaka:301529550783774721>',
    inaHappy: '<:inaHappy:301529610754195456>',
}
