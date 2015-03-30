
// next: (err, results:any):void
export function start(generatorDefinition, next) {
    setTimeout(() => runGenerator(generatorDefinition(), next || throwFirst))
}

// runnable: (err, results:any):void|generator|promise|array<runnable>
function run(runnable, next) {
    if(runnable.constructor === Array)
        runMany(runnable, next)
    else if(runnable.then)
        runnable.then(result => next(undefined, result), err => next(err))
    else if(runnable.next && runnable.throw)
        runGenerator(runnable, next)
    else
        runnable(nextOnce(next))
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
    let tick = (err, result) => {
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

function runMany(targets, next) {
    let length = targets.length
    if(!length)
        throw new Error("Can't execute empty array.")

    let stopped = false
    let results = []
    let completions = 0
    let done = (index, err, subResults) => {
        if(stopped)
            return
        if(err) {
            stopped = true
            return next(err)
        }
        results[index] = subResults
        completions += 1
        if(completions === length)
            next(undefined, results)
    }
    for(let i = 0; i < length; i += 1) {
        results.push(undefined)
        run(targets[i], (err, results) => done(i, err, results))
    }
}
