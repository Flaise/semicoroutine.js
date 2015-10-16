
/*
 * Adapts a Node-style continuation-passing-style function to a format that can be yielded to the
 * Semicoroutine generator runner or adapts a generator or generator function to be callable as
 * a continuation-passing-style function.
 *
 * If the argument is a normal function, it is assumed to take as its final argument a callback with
 * the signature (err, result)
 * Example:
 *
 *     function cpsFunction(a, b, next) {
 *         next(null, a + b)
 *     }
 *
 *     var adaptedFunction = adapt(cpsFunction)
 *
 *     let [result] = yield adaptedFunction(1, 2) // from inside of a generator
 *     // result is now 3
 *
 * If the argument is a generator or generator function, the result is a function that takes as its
 * only argument a continuation function.
 * Example:
 *
 *     it('runs an asynchronous unit test without callback hell', adapt(function*() {
 *         yield next => setTimeout(next, 1000)
 *         yield somethingElseAsynchronous()
 *     }))
 */
export function adapt(runnable) {
    if(isGenerator(runnable) || isGeneratorFunction(runnable))
        return (done) => start(runnable, done)
    
    return function(...args) {
        return function(next) {
            args.push(next)
            return runnable.apply(this, args)
        }
    }
}

function isGenerator(a) {
    return a.next && !!a.throw
}
function isGeneratorFunction(a) {
    return a.constructor.name === 'GeneratorFunction'
}

// next: (err, results:any):void
export function start(generator, next) {
    if(isGeneratorFunction(generator))
        generator = generator()
    
    setTimeout(() => runGenerator(generator, next || throwFirst))
}

// runnable: (err, results:any):void|generator|promise|array<runnable>|hash<string, runnable>
function run(runnable, next) {
    if(isGenerator(runnable))
        runGenerator(runnable, next)
    else if(runnable.then)
        runnable.then(result => next(undefined, result), next)
    else if(runnable.constructor === Function)
        runnable(nextOnce(next))
    else if(runnable.constructor === Array)
        runArray(runnable, next)
    else if(typeof runnable === 'object')
        runHash(runnable, next)
    else
        next(new Error(runnable + ' is not runnable.'))
}

function nextOnce(next) {
    let called = false
    return (err, ...results) => {
        if(called)
            throw new Error("Can't reuse continuation function.")
        called = true
        return next(err, results)
    }
}

function throwFirst(err) {
    if(err)
        throw err
}

function runGenerator(generator, next) {
    const tick = (err, result) => {
        let status
        try {
            if(err)
                status = generator.throw(err)
            else
                status = generator.next(result)
        }
        catch(err) {
            return next(err)
        }

        if(status.done)
            next(undefined, status.value)
        else if(status.value != undefined)
            run(status.value, tick)
        else
            tick()
    }
    tick()
}

function runArray(targets, next) {
    const ntargets = targets.length
    const results = []
    if(!ntargets)
        return next(undefined, results)
    const refs = {stopped: false, nresults: 0}
    for(let i = 0; i < ntargets; i += 1) {
        results.push(undefined)
        run(targets[i], done(i, refs, results, ntargets, next))
    }
}

function runHash(targets, next) {
    const keys = Object.keys(targets)
    const ntargets = keys.length
    const results = {}
    if(!ntargets)
        return next(undefined, results)
    const refs = {stopped: false, nresults: 0}
    for(let i = 0; i < ntargets; i += 1) {
        const key = keys[i]
        run(targets[key], done(key, refs, results, ntargets, next))
    }
}

function done(key, refs, results, ntargets, next) {
    return (err, subResults) => { // Called when one parallel task is finished
        if(refs.stopped)
            return
        if(err) {
            refs.stopped = true
            return next(err)
        }
        results[key] = subResults
        refs.nresults += 1
        if(refs.nresults === ntargets)
            next(undefined, results)
    }
}
