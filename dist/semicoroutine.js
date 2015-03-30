'use strict';Object.seal(Object.defineProperties(exports, {start:{get:function() {
  return start;
}, enumerable:true}}));
function start(generatorDefinition, next) {
  setTimeout(function() {
    return runGenerator(generatorDefinition(), next || throwFirst);
  });
}
function run(runnable, next) {
  if (runnable.constructor === Array) {
    runMany(runnable, next);
  } else {
    if (runnable.then) {
      runnable.then(function(result) {
        return next(undefined, result);
      }, function(err) {
        return next(err);
      });
    } else {
      if (runnable.next && runnable.throw) {
        runGenerator(runnable, next);
      } else {
        runnable(nextOnce(next));
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
function runMany(targets, next) {
  var length = targets.length;
  if (!length) {
    throw new Error("Can't execute empty array.");
  }
  var stopped = false;
  var results = [];
  var completions = 0;
  var done = function(index, err, subResults) {
    if (stopped) {
      return;
    }
    if (err) {
      stopped = true;
      return next(err);
    }
    results[index] = subResults;
    completions += 1;
    if (completions === length) {
      next(undefined, results);
    }
  };
  var $jscomp$loop$0 = {i:undefined};
  $jscomp$loop$0.i = 0;
  for (;$jscomp$loop$0.i < length;$jscomp$loop$0 = {i:$jscomp$loop$0.i}, $jscomp$loop$0.i += 1) {
    results.push(undefined);
    run(targets[$jscomp$loop$0.i], function($jscomp$loop$0) {
      return function(err, results) {
        return done($jscomp$loop$0.i, err, results);
      };
    }($jscomp$loop$0));
  }
}
;
