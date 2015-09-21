// The MIT License (MIT)
//
// Copyright (c) 2014 Jonas Finnemann Jensen
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var _           = require('lodash');
var debug       = require('debug')('json-parameterization');
var safeEval    = require('notevil');
var vm          = require('vm');

/** Evaluate an expression in a given context, using two sand boxes :) */
var evalExpr = function(expr, context) {
  if (typeof(expr) !== 'string') {
    return expr;
  }
  context = _.cloneDeep(context, function(value) {
    if (typeof(value) === 'function') {
      return value;
    }
    return undefined;
  });

  // Evaluate in a sand box
  try {
    return safeEval(expr, context);
  } catch (err) {
    var err = new Error("Error interpreting: `" + expression + "` got '" +
                        error.toString() + "'");
    err.expression = expr;
    err.code = 'ParameterizationFailed';
    throw err;
  }
};

/** Parameterize input with params */
var parameterize = function(input, params) {

  // Parameterize a string
  var parameterizeString = function(str) {
    // Otherwise treat ${,..} as string interpolations
    return str.replace(/\${([^}]*)}/g, function(originalText, expr) {
      try {
        var val = evalExpr(expr, params);
        if (typeof(val) !== 'string' && typeof(val) !== 'number') {
          var error = new Error("Can't substitute " + typeof(val) + " from " +
                                "expression: `" + expr + "` into string: '" +
                                str + "'");
          error.expression = expr;
          error.code = 'ParameterizationFailed';
          throw error;
        }
        return val;
      } catch (err) {
        err.construct = str;
        throw err;
      }
    });
  };

  // Create clone function
  var clone = function(value) {
    // Parameterized strings
    if (typeof(value) === 'string') {
      return parameterizeString(value);
    }

    // Don't parameterize numbers and booleans
    if (typeof(value) !== 'object') {
      return value;
    }

    // Parameterize array entries
    if (value instanceof Array) {
      // Parameterize array and filter undefined entries
      return value.map(clone).filter(function(entry) {
        return entry !== undefined;
      });
    }

    // Handle if-constructs
    if (typeof(value['$if']) === 'string') {
      try {
        if (evalExpr(value['$if'], params)) {
          return clone(value['then']);
        } else {
          return clone(value['else']);
        }
      } catch (err) {
        err.construct = _.cloneDeep(value);
        throw err;
      }
    }
    // Handle switch-constructs
    if (typeof(value['$switch']) === 'string') {
      try {
        var label = evalExpr(value['$switch'], params);
        return clone(value[label]);
      } catch (err) {
        err.construct = _.cloneDeep(value);
        throw err;
      }
    }
    // Handle eval-constructs
    if (typeof(value['$eval']) === 'string') {
      try {
        return evalExpr(value['$eval'], params);
      } catch (err) {
        err.construct = _.cloneDeep(value);
        throw err;
      }
    }

    // Parameterize normal objects, both keys and values
    var result = {};
    for(var k in value) {
      // Parameterize string
      var key = parameterizeString(k);
      if (typeof(key) !== 'string') {
        key = k;
      }
      // Parameterize value
      var val = clone(value[k]);
      if (val === undefined) {
        continue; // Don't assign undefined, use it to delete properties
      }
      result[key] = val;
    }
    return result;
  };

  // Let's use a top-level sandbox for good measure
  var result, error;
  vm.runInNewContext("run()", {
    run: function() {
      try {
        // Create clone
        result = clone(input);
      } catch (err) {
        error = err;
      }
    },
  }, {
    displayErrors:  false,
    timeout:        500
  });

  if (error) {
    throw error;
  }
  return result;
};


// Export parameterize
module.exports = parameterize;
