suite('parameterize', function() {
  var _             = require('lodash');
  var debug         = require('debug')('json-parameterization:test');
  var assert        = require('assert');
  var parameterize  = require('./');

  test("Empty case", function() {
    var input = {};
    var params = {};
    var output = {};
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("String extraction", function() {
    var input = {
      key1:     "${'Hello World'}",
      key2:     "${   'Hello World'   }",
      key3:     "${\"Hello World\"}",
      key4:     "${  \"Hello World\"   }"
    };
    var params = {};
    var output = {
      key1:     "Hello World",
      key2:     "Hello World",
      key3:     "Hello World",
      key4:     "Hello World"
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("Substitute strings in", function() {
    var input = {
      key1:       "${param1}",
      key2:       "${param2}"
    };
    var params = {
      param1:     "PAR1",
      param2:     "PAR2",
    };
    var output = {
      key1:     "PAR1",
      key2:     "PAR2",
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("Substitute functions in", function() {
    var input = {
      key1:       "${param1()}",
      key2:       "${param2()}"
    };
    var params = {
      param1:     function() { return "PAR1"; },
      param2:     function() { return "PAR" + (1 + 1); }
    };
    var output = {
      key1:     "PAR1",
      key2:     "PAR2",
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("Substitute objects in", function() {
    var input = {
      key1:       {$eval: "param1"},
      key2:       {$eval: "param2"}
    };
    var params = {
      param1:     {my: "dictionary"},
      param2:     [1,2,3,4],
    };
    var output = {
      key1:     {my: "dictionary"},
      key2:     [1,2,3,4],
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("Substitute objects in key (doesn't work)", function() {
    var input = {
      '${param1}':   {$eval: "param2"}
    };
    var params = {
      param1:     {my: "dictionary"},
      param2:     [1,2,3,4],
    };
    try {
      parameterize(input, params);
    } catch(err) {
      return;
    }
    assert(false, "Expected an error");
  });

  test("Modify string", function() {
    var input = {
      key1:     "${ toUpper( 'hello world') }",
      key2:     "${  toLower(toUpper('hello world'))   }",
      key3:     "${   toLower(  toUpper(  text))  }",
    };
    var params = {
      toUpper: function(text) {
        return text.toUpperCase();
      },
      toLower: function(text) {
        return text.toLowerCase();
      },
      text: 'hello World'
    };
    var output = {
      key1:     "HELLO WORLD",
      key2:     "hello world",
      key3:     "hello world"
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("Substitute into a key", function() {
    var input = {
      "${prefix}Key": "Value"
    };
    var params = {
      'prefix':     'Some'
    };
    var output = {
      SomeKey: 'Value'
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("$if -> then", function() {
    var input = {
      value: {
        $if:  'a > b',
        then: "a is greater than b",
        else: "a is less than or equal to b"
      }
    };
    var params = {
      a: 2,
      b: 1
    };
    var output = {
      value: "a is greater than b"
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("$if -> else", function() {
    var input = {
      value: {
        $if:  'a > b',
        then: "a is greater than b",
        else: "a is less than or equal to b"
      }
    };
    var params = {
      a: 1,
      b: 2
    };
    var output = {
      value: "a is less than or equal to b"
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("Conditional property w. $if (true)", function() {
    var input = {
      value: {
        $if:  'a > b',
        then: "Value only if a > b",
      }
    };
    var params = {
      a: 2,
      b: 1
    };
    var result = parameterize(input, params);
    assert(result.hasOwnProperty('value'), "Expected value property");
    var output = {
      value: "Value only if a > b"
    };
    assert.deepEqual(result, output, "Predicted output wasn't matched!");
  });

  test("Conditional property w. $if (false)", function() {
    var input = {
      value: {
        $if:  'a > b',
        then: "Value only if a > b"
      }
    };
    var params = {
      a: 1,
      b: 2
    };
    var result = parameterize(input, params);
    assert(!result.hasOwnProperty('value'), "Expected no value property");
    var output = {};
    assert.deepEqual(result, output, "Predicted output wasn't matched!");
  });

  test("$if nested $eval", function() {
    var input = {
      value: {
        $if:  'a > b',
        then: {$eval: 'a + b'}
      }
    };
    var params = {
      a: 2,
      b: 1
    };
    var output = {
      value: 3
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("$switch (matching case)", function() {
    var input = {
      value: {
        $switch:  '"case" + a',
        caseA:    "Got case A",
        caseB:    "Got case B"
      }
    };
    var params = {
      a: "A"
    };
    var output = {
      value: "Got case A"
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("$switch (conditional)", function() {
    var input = {
      value: {
        $switch: '"case" + a',
      }
    };
    var params = {
      a: "A"
    };
    var result = parameterize(input, params);
    assert(!result.hasOwnProperty('value'), "Expected no value property");
    var output = {};
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("$switch nested $eval", function() {
    var input = {
      value: {
        $switch:  '"case" + a',
        caseA:    {$eval: 'a + b'},
        caseB:    "Got case B"
      }
    };
    var params = {
      a: "A",
      b: "B"
    };
    var output = {
      value: "AB"
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });

  test("function as parameter", function() {
    var input = {
      value: [
        {$eval: 'func(0)'},
        {$eval: 'func(0)'},
        {$eval: 'func(-1)'},
        {$eval: 'func(-2)'},
        {$eval: 'func(0)'},
        {$eval: 'func(0)'},
        {$eval: 'func(0)'},
        {$eval: 'func(0)'},
        {$eval: 'func(0)'},
        {$eval: 'func(1+1)'}
      ]
    };
    var i = 0;
    var params = {
      'func':  function(x) { i += 1; return x + i; }
    };
    var output = {
      value: [1, 2, 2, 2, 5, 6, 7, 8, 9, 12]
    };
    assert.deepEqual(parameterize(input, params), output,
                     "Predicted output wasn't matched!");
  });
});
