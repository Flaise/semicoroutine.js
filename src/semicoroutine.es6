
export function adapt(runnable) {
    if(isGenerator(runnable))
        return (next) => start(runnable, next)
        
    else if(isGeneratorFunction(runnable))
        return function(...args) {
            const next = args.pop()
            start(runnable.apply(this, args), next)
        }
        
    else
        return function(...args) {
            return function(next) {
                args.push(next)
                return runnable.apply(this, args)
            }
        }
}

export function adapt1(func) {
    return function(...args) {
        return function*() {
            const [result] = yield function(next) {
                args.push(next)
                func.apply(this, args)
            }
            return result
        }
    }
}

export function start(runnable, ...args) {
    if(typeof args[args.length - 1] !== 'function')
        args.push(throwFirst)
    setTimeout(() => run(runnable, ...args))
}

export function isGenerator(a) {
    return a.next && !!a.throw
}
export function isGeneratorFunction(a) {
    return a.constructor.name === 'GeneratorFunction'
}

function run(runnable, ...args) {
    const next = args.pop()
    
    if(runnable == undefined)
        setTimeout(next)
    else if(isGenerator(runnable))
        runGenerator(runnable, next)
    else if(isGeneratorFunction(runnable))
        runGenerator(runnable(...args), next)
    else if(runnable.then)
        runnable.then(result => next(undefined, result), next)
    else if(runnable.constructor === Function) {
        args.push(nextOnce(next))
        runnable(...args)
    }
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
        else
            run(status.value, tick)
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
