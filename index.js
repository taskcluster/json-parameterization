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
  context = _.cloneDeep(context);
  var result  = undefined;
  var error   = undefined;
  // Let's use two sandboxes for good measure
  vm.runInNewContext("run()", {
    run: function() {
      try {
        result = safeEval(expr, context);
      } catch (err) {
        error = err || null;
      }
    },
  }, {
    displayErrors:  false,
    timeout:        500
  });

  // Throw error if it's not undefined
  if (error !== undefined) {
    throw error;
  }

  return result;
};

/** Parameterize input with params */
var parameterize = function(input, params) {

  // Parameterize a string
  var parameterizeString = function(str) {
    // Otherwise treat ${,..} as string interpolations
    return str.replace(/\${([^}]*)}/g, function(originalText, expr) {
      try {
        var result = evalExpr(expr, params);
        if (result === undefined) {
          return '';
        }
      } catch (err) {
        // Signal errors by returning originalText
        return originalText;
      }
    });
  };

  // Substitute objects that needs this
  var substitute = function(obj) {
    // Parameterized strings
    if (typeof(obj) === 'string') {
      return parameterizeString(obj);
    }

    // Parameterize array entries
    if (obj instanceof Array) {
      // Parameterize array and filter undefined entries
      return _.cloneDeep(obj[k], substitute).filter(function(entry) {
        return entry !== undefined;
      });
    }

    // Parameterize keys of objects
    if (typeof(obj) === 'object') {
      // Handle if-constructs
      if (typeof(obj['$if']) === 'string') {
        try {
          if (evalExpr(obj['$if'], params)) {
            return _.cloneDeep(obj['then'], substitute);
          } else {
            return _.cloneDeep(obj['else'], substitute);
          }
        } catch (err) {
          // Ignore error, and clone the $if object as a signal
        }
      }
      // Handle switch-constructs
      if (typeof(obj['$switch']) === 'string') {
        try {
          var label = evalExpr(obj['$switch'], params);
          return _.cloneDeep(obj[label], substitute);
        } catch (err) {
          // Ignore error, and clone the $switch object as a signal
        }
      }
      // Handle eval-constructs
      if (typeof(obj['$eval']) === 'string') {
        try {
          return evalExpr(obj['$eval'], params);
        } catch (err) {
          // Ignore error, and clone the $eval object as a signal
        }
      }

      // Parameterize normal objects
      var clone = {};
      for(var k in obj) {
        // Parameterize string
        var key = parameterizeString(k);
        if (typeof(key) !== 'string') {
          key = k;
        }
        // Parameterize value
        var val = _.cloneDeep(obj[k], substitute);
        if (val === undefined) {
          continue; // Don't assign undefined, use it to delete properties
        }
        clone[key] = val;
      }
      return clone;
    }

    // Clone all other values as lodash normally would
    return undefined;
  };

  // Create clone while substituting objects that need it
  return _.cloneDeep(input, substitute);
};


// Export parameterize
module.exports = parameterize;
