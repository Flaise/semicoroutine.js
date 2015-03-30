'use strict'

function closureCompileSingle(inputdir, outputdir, options, next) {
    if(!options.fileIn)
        throw new Error('options.fileIn is required')

    var path = require('path')
    var fs = require('fs')
    var closurecompiler = require('closurecompiler')

    closurecompiler.compile(
        path.join(inputdir, options.fileIn), options.ccOptions, function(err, result) {
            if(err)
                return next(err)
            fs.writeFile(path.join(outputdir, options.fileOut), result, next)
        }
    )
}


function es6ModuleCrosspiler(input, options) {
    var recast = require('recast')
    var esprima = require('esprima-fb')
    var Module = require('es6-module-crosspiler')
     
    var ast = recast.parse(input, {esprima: esprima})
    var m = Module(ast)
    ast = m.transform(ast)
    var result = recast.print(ast)
    return result.code
}


var gobble = require('gobble')


var normal = gobble('./src')
    .transform(es6ModuleCrosspiler)
    .transform(closureCompileSingle, {
        fileIn: 'semicoroutine.es6',
        fileOut: 'semicoroutine.js',
        ccOptions: {language_in: 'ES6_STRICT',
                    language_out: 'ES5_STRICT',
                    transpile_only: true,
                    formatting: 'pretty_print'}
    })

var minified = gobble('./src')
    .transform(es6ModuleCrosspiler)
    .transform(closureCompileSingle, {
        fileIn: 'semicoroutine.es6',
        fileOut: 'semicoroutine.min.js',
        ccOptions: {language_in: 'ES6_STRICT',
                    language_out: 'ES5_STRICT',
                    compilation_level: 'ADVANCED_OPTIMIZATIONS'}
    })

module.exports = gobble([normal, minified])
