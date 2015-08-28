'use strict';Object.seal(Object.defineProperties(exports, {adapt:{get:function() {
  return adapt;
}, enumerable:!0}, start:{get:function() {
  return start;
}, enumerable:!0}}));
function adapt(a) {
  return function(b) {
    for (var d = [], e = 0;e < arguments.length;++e) {
      d[e - 0] = arguments[e];
    }
    return function(b) {
      d.push(b);
      return a.apply(this, d);
    };
  };
}
function start(a, b) {
  "GeneratorFunction" === a.constructor.name && (a = a());
  setTimeout(function() {
    return runGenerator(a, b || throwFirst);
  });
}
function run(a, b) {
  a.next && a.throw ? runGenerator(a, b) : a.then ? a.then(function(a) {
    return b(void 0, a);
  }, b) : a.constructor === Function ? a(nextOnce(b)) : a.constructor === Array ? runArray(a, b) : "object" === typeof a ? runHash(a, b) : b(Error(a + " is not runnable."));
}
function nextOnce(a) {
  var b = !1;
  return function(d, e) {
    for (var f = [], c = 1;c < arguments.length;++c) {
      f[c - 1] = arguments[c];
    }
    if (b) {
      throw Error("Can't reuse continuation function.");
    }
    b = !0;
    return a(d, f);
  };
}
function throwFirst(a) {
  if (a) {
    throw a;
  }
}
function runGenerator(a, b) {
  var d = function(e, f) {
    var c = void 0;
    try {
      c = e ? a.throw(e) : a.next(f);
    } catch (g) {
      return b(g);
    }
    c.done ? b(void 0, c.value) : void 0 != c.value ? run(c.value, d) : d();
  };
  d();
}
function runArray(a, b) {
  var d = a.length, e = [];
  if (!d) {
    return b(void 0, e);
  }
  for (var f = {stopped:!1, nresults:0}, c = 0;c < d;c += 1) {
    e.push(void 0), run(a[c], done(c, f, e, d, b));
  }
}
function runHash(a, b) {
  var d = Object.keys(a), e = d.length, f = {};
  if (!e) {
    return b(void 0, f);
  }
  for (var c = {stopped:!1, nresults:0}, g = 0;g < e;g += 1) {
    var h = d[g];
    run(a[h], done(h, c, f, e, b));
  }
}
function done(a, b, d, e, f) {
  return function(c, g) {
    if (!b.stopped) {
      if (c) {
        return b.stopped = !0, f(c);
      }
      d[a] = g;
      b.nresults += 1;
      b.nresults === e && f(void 0, d);
    }
  };
}
;
