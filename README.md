Semicoroutine
---

Allows writing asynchronous code without deeply nested callbacks. Uses generators and their yield
expressions to represent breaks in the event loop instead of letting a function return normally
followed by calling an entirely different function.


Installation
---

    npm install --save semicoroutine
    
    
How It Works
---

A semicoroutine is a generator interpreted as though it were an asynchronous function, similar to a
coroutine from Scheme or a green thread from Java before it supported native threads. No Javascript
engine supports or can reasonably be made to support actual coroutines but that's a good thing
because semicoroutines are a great deal better from a readability/maintainability perspective. Read
more about the difference between coroutines and semicoroutines
[here](http://calculist.org/blog/2011/12/14/why-coroutines-wont-work-on-the-web/).


Usage
---

Semicoroutine is designed to be written in ECMAScript 6. To use such code today, ES6 code can be
transpiled to whatever your platform supports with a tool like [Babel](https://babeljs.io/).
Alternatively, another programming environment can be used as long as it creates generators or
objects that behave like generators (i.e. they have `next()` and `throw()` functions).

A semicoroutine is started by passing a generator or a generator function the `start()` function.
The most basic example would be:

    import {start} from 'semicoroutine'
    
    let a = 0
    
    start(function*() {
        // code in this block is executed in the next turn of the event loop
        a += 1
        
        console.log(a) // 1
    })
    
    // This code is executed in the current turn of the event loop without waiting for the generator
    // to begin executing.
    console.log(a) // 0

What makes this style of programming interesting is how it can be used to represent calling code
asynchronously both serially and in parallel with linear standardized syntax instead of nested
closures or functions in nonstandard libraries where you must repeatedly consult the documentation.
For example:

    import {start} from 'semicoroutine'
    
    function* generatorFunctionA() {
        // Statements in this block are interpreted in the same way as the statements in the
        // generator function that is passed to the start() function
        return 'something'
    }
    function* generatorFunctionB(a, b) {
        // Arguments passed to the generator function are visible in this block while executing
        // asynchronously so the syntax is almost the same as calling a synchronous function.
        return a + b
    }
    
    function* generatorFunctionC() {
        // ...
    }
    function* generatorFunctionD() {
        // ...
    }
    
    start(function*() {
        // These two functions are called in sequence.
        let resultA = yield generatorFunctionA()
        let resultB = yield generatorFunctionB(1, 2)
        
        // These two functions are called in parallel. Since Javascript is single-threaded, they
        // have to begin one at a time, which happens to be in the order specified, but if they
        // call asynchronous functions themselves, more than one asynchronous operation from this
        // list can be pending at the same time.
        let [resultC, resultD] = yield [generatorFunctionC(), generatorFunctionD()]
        
        // You can also use a hash instead of a list:
        let {a: resultE, b: resultF} = yield {a: generatorFunctionC(), b: generatorFunctionD()}
    })
    
What makes asynchronous programming in Javascript most useful is when code interacts with the system
clock or when it performs I/O. The only functions in Javascript that let you do this are built into
the virtual machine or the standard library and none of them are designed to by themselves be
compatible with the asynchronous generator style of programming. In order to make them work, they
must be adapted to a format that the Semicoroutine library can handle. The `adapt()` function does
this for most functions written in Node's continuation-passing-style but first here's an example of
doing it manually:

    import {start} from 'semicoroutine'
    import {readFile} from 'fs'
    
    start(function*() {
        try {
            let fileName = 'some string'
            
            // When yielding a function, it is assumed to have a particular format. After it is
            // yielded to Semicoroutine's scheduler, it will be called with a single argument, a
            // callback that takes a variable number of arguments, the first of which is an error,
            // or null/undefined if no error occurred.
            let results = yield function(done) {
                // When calling the function from the standard library, the last argument is
                // supplied by Semicoroutine. The rest are supplied by the enclosing scope.
                readFile(fileName, done)
            }
            
            // If there was no error, readFile passes a nullish value as the first argument to
            // `done`. The rest of the parameters passed to `done` are returned from the yield
            // expression in the form of an array. In this case, only one result is generated, so
            // the list has only one element.
            let fileContents = results[0]
            
            // `fileContents` is now a Buffer object.
        }
        catch(error) {
            // If `readFile` called `done` with an error object as the first parameter then the
            // yield expression throws that object and you can handle that error with the syntax
            // built into Javascript without consulting the documentation of every library you use.
        }
    })
    
The `adapt()` function of Semicoroutine wraps a Node-style continuation-passing function for you. A
more concise way of writing the above would be:

    import {start, adapt} from 'semicoroutine'
    import fs from 'fs'
    
    const readFile = adapt(fs.readFile)
    
    start(function*() {
        try {
            let fileName = 'some string'
            
            let [fileContents] = yield readFile(fileName)
            
            // Do something with the contents of the file here
        }
        catch(error) {
            // Handle the error here
        }
    })
    
If an error thrown by a yield expression goes uncaught, it will bubble up into the generator that
called it. If that generator does not handle the error, it will continue bubbling up until it does
get handled. To demonstrate:

    import {start} from 'semicoroutine'
    
    function* A() {
        throw new Error('oops')
    }
    function* B() {
        yield A() // This expression throws an exception
    }
    
    start(function*() {
        try {
            yield B() // This expression throws the same error that started in `A()`
        }
        catch(error) {
            // ...
        }
    })
    
If a semicoroutine does not handle an error itself, it can be passed on to a callback where it will
be handled the way Node normally handles errors. The callback to do this with must be the second
argument of the `start()` function. Here's an example:

    import {start} from 'semicoroutine'
    
    function A(next) {
        start(function*() {
            throw new Error('Not handled by the semicoroutine')
        }, next)
    }
    
    A(function(err, result) {
        if(err) {
            // handle the error
        }
        else {
            // do something with the result
        }
    })
    
The second parameter of the `start()` function is the same as the last parameter of most of Node's
continuation-passing-style functions; it's a function that takes an error as a first parameter and
the results are after the first parameter. The result is whatever is returned from the generator.
Since a generator can only return one result, there will be at most one result passed to the
callback. Example:

    import {start} from 'semicoroutine'
    
    function* returnsSomething() {
        return 1
    }
    
    start(returnsSomething, function(err, result) {
        console.log(result) // 1
    })
    
The second parameter of `start()` is intended for compatibility with non-semicoroutine code. When
writing new code that uses the Semicoroutine library, it's generally going to be better practice to
keep code in the generator functions and use yield expressions instead.


License
---

MIT
