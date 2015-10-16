'use strict'
var gobble = require('gobble')


module.exports = gobble('./src').transform('babel', {optional: ['runtime']})
