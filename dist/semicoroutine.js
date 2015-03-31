'use strict';Object.seal(Object.defineProperties(exports, {start:{get:function() {
  return start;
}, enumerable:true}}));
function start(generator, next) {
  if (generator.constructor.name === "GeneratorFunction") {
    generator = generator();
  }
  setTimeout(function() {
    return runGenerator(generator, next || throwFirst);
  });
}
function run(runnable, next) {
  if (runnable.next && runnable.throw) {
    runGenerator(runnable, next);
  } else {
    if (runnable.then) {
      runnable.then(function(result) {
        return next(undefined, result);
      }, function(err) {
        return next(err);
      });
    } else {
      if (runnable.constructor === Function) {
        runnable(nextOnce(next));
      } else {
        if (runnable.constructor === Array) {
          runArray(runnable, next);
        } else {
          if (typeof runnable === "object") {
            runHash(runnable, next);
          } else {
            throw new Error(runnable + " is not runnable.");
          }
        }
      }
    }
  }
}
function nextOnce(next) {
  var called = false;
  return function(err, results) {
    results = [].slice.call(arguments, 1);
    if (called) {
      throw new Error("Can't reuse continuation function.");
    }
    called = true;
    return next(err, results);
  };
}
function throwFirst(err) {
  if (err) {
    throw err;
  }
}
function runGenerator(generator, next) {
  var tick = function(err, result) {
    var status = undefined;
    try {
      if (err) {
        status = generator.throw(err);
      } else {
        status = generator.next(result);
      }
    } catch (err) {
      return next(err);
    }
    if (status.done) {
      next(undefined, status.value);
    } else {
      if (status.value != undefined) {
        run(status.value, tick);
      } else {
        tick();
      }
    }
  };
  tick();
}
function runArray(targets, next) {
  var ntargets = targets.length;
  var results = [];
  if (!ntargets) {
    return next(undefined, results);
  }
  var refs = {stopped:false, nresults:0};
  for (var i = 0;i < ntargets;i += 1) {
    results.push(undefined);
    run(targets[i], done(i, refs, results, ntargets, next));
  }
}
function runHash(targets, next) {
  var keys = Object.keys(targets);
  var ntargets = keys.length;
  var results = {};
  if (!ntargets) {
    return next(undefined, results);
  }
  var refs = {stopped:false, nresults:0};
  for (var i = 0;i < ntargets;i += 1) {
    var key = keys[i];
    run(targets[key], done(key, refs, results, ntargets, next));
  }
}
function done(key, refs, results, ntargets, next) {
  return function(err, subResults) {
    if (refs.stopped) {
      return;
    }
    if (err) {
      refs.stopped = true;
      return next(err);
    }
    results[key] = subResults;
    refs.nresults += 1;
    if (refs.nresults === ntargets) {
      next(undefined, results);
    }
  };
}
;
