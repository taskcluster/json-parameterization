json-parameterization - Parameterization of JSON Structures
===========================================================

Parameterize untrusted JSON structures safely. This is basically a very simple
library for substituting strings into JSON structures.

**Example**

```js
var parameterize = require('json-parameterization');

var input = {
  "${key-prefix}Key":  "${now()} ms",
  "say":               "${toLower('Hello World')}",
  "tags":              {"$eval": 'myobj'},
  "cond": {
    "$if": 'value == 7',
    "then": 'value is 7',
    "else": 'value isnt 7',
  },
  "cond2": {
    "$if": 'value != 7',
    "then": 'value is not 7',
  },
};

var params = {
  'key-prefix':   'time',
  'now':          function() {
                    return new Date().getTime();
                  },
  'toLower':      function(param) {
                    return param.toLowerCase();
                  },
  'myobj':        {tag: 'value'},
  'value':        7,
};

parameterize(input, params);
```

**Result**

```js
{
  timeKey:      "1411165317832 ms",
  say:          "hello world",
  tags:         {tag: 'value'},
  cond:         'value is 7',
  // cond2 doesn't exist! because there is 'else' value for it
}
```


License
-------
The `json-parameterization` library is released on the MIT license, see the
`LICENSE` for complete license.
