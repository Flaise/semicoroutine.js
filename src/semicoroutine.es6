
// next: (err, results:any):void
export function start(generator, next) {
    if(generator.constructor.name === 'GeneratorFunction')
        generator = generator()

    setTimeout(() => scheduleGenerator(generator, wrapNext(next)))
}

function wrapNext(next) {
    return (err, result) => {
        if(next)
            try {
                return next(err, result)
            }
            catch(err) {
                console.error(err)
            }
        else if(err)
            console.error(err)
    }
}

// runnable: (err, results:any):void|generator|promise|array<runnable>|hash<string, runnable>
function run(runnable, next) {
    if(runnable.next && runnable.throw)
        scheduleGenerator(runnable, next)
    else if(runnable.then)
        runnable.then(result => next(undefined, result), err => next(err))
    else if(runnable.constructor === Function)
        runFunction(runnable, next)
    else if(runnable.constructor === Array)
        runArray(runnable, next)
    else if(typeof runnable === 'object')
        runHash(runnable, next)
    else
        next(new Error(runnable + ' is not runnable.'))
}


import domain from 'domain'

function runFunction(runnable, next) {
    // throw new Error()
    let dom = domain.create()
    //let error = new Error()
    let stack = new Error().stack

    let done = false
    let continuation = (err, ...results) => {
        if(done)
            throw new Error("Can't reuse continuation function.")
        done = true
        next(err, results)
    }
    dom.on('error', err => {
        if(done)
            // Error came from a call to next() which was supplied by this library.
            // Probably an internal error.
            throw err
        done = true
        console.log('c')
        //next(new Error(err.stack))
        //console.log('RRRRRRRRR', err.stack, 'CCCCCCCCCC', error.stack)
        //error.stack = err.stack + error.stack


        console.log('NNNNNNNNNNNNNNNN', stack)
        console.log('>>>>>>>>>>>', err.stack)

        err.stack = err.stack+stack

        console.log('OOOOOOO', err.stack)
        next(err)
    })
    dom.run(() => runnable(continuation))


    // let doneCalled = false
    // let done = (err, ...results) => {
    //     if(doneCalled)
    //         throw new Error("Can't reuse continuation function.")
    //     doneCalled = true
    //     next(err, results)
    // }
    // try {
    //     runnable(done)
    // }
    // catch(err) {
    //     if(doneCalled)
    //         throw err
    //     else
    //         done(err)
    // }
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

/*
 * Clears the event queue. Intended for unit testing. If production code has to call this function
 * then refactoring is likely in order.
 */
export function clear() {
    if(generating)
        throw new Error("Can't clear event queue while processing events.")
    generatorsPending = []
}


let generatorsPending = []
let generating = false

function scheduleGenerator(generator, next, err, result) {
    generatorsPending.push({generator: generator, next: next, err: err, result: result})
    if(!generating) {
        generating = true
        runGenerators()
    }
}

function runGenerators() {
    while(generatorsPending.length) {
        let {generator, next, err, result} = generatorsPending.shift()
        let status
        try {
            if(err)
                status = generator.throw(err)
            else
                status = generator.next(result)
        }
        catch(ex) {
            next(ex)
            continue
        }

        if(status.done)
            next(undefined, status.value)
        else if(status.value != undefined)
            run(status.value, (err, result) => scheduleGenerator(generator, next, err, result))
        else
            scheduleGenerator(generator, next)
    }

    generating = false
}
