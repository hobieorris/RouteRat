
/*
json_parse.js
2012-06-20

Public Domain.

NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

This is a reference implementation. You are free to copy, modify, or
redistribute.

This code should be minified before deployment.
See http://javascript.crockford.com/jsmin.html

USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
NOT CONTROL.
*/

/* butchered by Hobie Orris April 2013 to support Google object notation */

var google_parse = (function () 
{
    "use strict";

// This is a function that can parse a Google object text, producing a JavaScript
// data structure. It is a simple, recursive descent parser. It does not use
// eval or regular expressions, so it can be used as a model for implementing
// a JSON parser in other languages.

// We are defining the function inside of another function to avoid creating
// global variables.

    var at, // The index of the current character
        ch, // The current character
        escapee = 
		{
            '"': '"',
            '\\': '\\',
            '/': '/',
            b: '\b',
            f: '\f',
            n: '\n',
            r: '\r',
            t: '\t',
			x: '%'
        },
        text,
		qc = "\'",
		// Call error when something is wrong.

         error = function (m) 
		 {
            throw {
                name: 'SyntaxError',
                message: m,
                at: at,
                text: text
            };
        },

        next = function (c) 
		{

		// If a c parameter is provided, verify that it matches the current character.

            if (c && c !== ch) 
			{
                error("Expected '" + c + "' instead of '" + ch + "'");
            }

			// Get the next character. When there are no more characters,
			// return the empty string.

            ch = text.charAt(at);
            at += 1;
            return ch;
        },

        previous = function () 
		{
            at -= 1;
           ch = text.charAt(at);
             return ch;
        },

		// Parse a number value.

        number = function () 
		{
            var number,
                string = '';

            if (ch === '-') 
			{
                string = '-';
                next('-');
            }
            while (ch >= '0' && ch <= '9')
			{
                string += ch;
                next();
            }
            if (ch === '.') 
			{
                string += '.';
                while (next() && ch >= '0' && ch <= '9') 
				{
                    string += ch;
                }
            }
            if (ch === 'e' || ch === 'E') 
			{
                string += ch;
                next();
                if (ch === '-' || ch === '+') 
				{
                    string += ch;
                    next();
                }
                while (ch >= '0' && ch <= '9') 
				{
                    string += ch;
                    next();
                }
            }
            number = +string;
            if (!isFinite(number)) 
			{
                error("Bad number");
            } 
			else 
			{
                return number;
            }
        },

		// Parse a string value.

        name = function ()
		{
            var hex,
                i,
                string = '',
                uffff,
				endquote=false;

			// When parsing for string values, we must look for " and \ characters.

            if (ch === qc) 
				endquote=true;
			else
				previous();

			while (next()) 
			{
				if (ch === qc && endquote) 
				{
					next();
					//console.log('NAME[' + string + ']');
					return string;
				}
				if (ch === '\\') 
				{
					next();
					if (ch === 'u') 
					{
						uffff = 0;
						for (i = 0; i < 4; i += 1) 
						{
							hex = parseInt(next(), 16);
							if (!isFinite(hex)) 
							{
								break;
							}
							uffff = uffff * 16 + hex;
						}
						string += String.fromCharCode(uffff);
					} 
					else if (typeof escapee[ch] === 'string') 
					{
						string += escapee[ch];
					} 
					else 
					{
						break;
					}
				}
				else if (ch === ':' && endquote == false)
				{
					//console.log('NAME[' + string + ']');
					return string;
				}
				else 
				{
					string += ch;
				}
			}
        },

		// Parse a string value.

        string = function () 
		{
            var hex,
                i,
                string = '',
                uffff;

			// When parsing for string values, we must look for " and \ characters.

            if (ch === qc) 
			{
                while (next()) 
				{
                    if (ch === qc) 
					{
                        next();
 					//console.log('STR[' + string + ']');
                       return string;
                    }
                    if (ch === '\\') 
					{
                        next();
                        if (ch === 'u') 
						{
                            uffff = 0;
                            for (i = 0; i < 4; i += 1) 
							{
                                hex = parseInt(next(), 16);
                                if (!isFinite(hex)) 
								{
                                    break;
                                }
                                uffff = uffff * 16 + hex;
                            }
                            string += String.fromCharCode(uffff);
                        } 
						else if (typeof escapee[ch] === 'string') 
						{
                            string += escapee[ch];
                        } 
						else 
						{
                            break;
                        }
                    } 
					else 
					{
                        string += ch;
                    }
                }
            }
        },

		// Skip whitespace.

        white = function () 
		{
			while (ch && ch <= ' ') 
			{
                next();
            }
        },

		// true, false, or null.

        word = function () 
		{
            switch (ch) 
			{
				case 't':
					next('t');
					next('r');
					next('u');
					next('e');
					return true;
				case 'f':
					next('f');
					next('a');
					next('l');
					next('s');
					next('e');
					return false;
				case 'n':
					next('n');
					next('u');
					next('l');
					next('l');
					return null;
            }
            error("Unexpected '" + ch + "'");
        },

        value, // Place holder for the value function.

		// Parse an array value.

        array = function () 
		{
            var array = [];

            if (ch === '[') 
			{
                next('[');
                white();
                if (ch === ']')
				{
                    next(']');
                    return array; // empty array
                }
                while (ch) 
				{
                    array.push(value());
                    white();
                    if (ch === ']')
					{
                        next(']');
                        return array;
                    }
                    next(',');
                    white();
                }
            }
            error("Bad array");
        },

		// Parse an object value.

        object = function () 
		{
            var key,
                object = {};

            if (ch === '{') 
			{
                next('{');
                white();
                if (ch === '}') 
				{
                    next('}');
                    return object; // empty object
                }
                while (ch) 
				{
                    key = name();
                    white();
                    next(':');
                    if (Object.hasOwnProperty.call(object, key)) 
					{
                        error('Duplicate key "' + key + '"');
                    }
                    object[key] = value();
                    white();
                    if (ch === '}') 
					{
                        next('}');
                        return object;
                    }
                    next(',');
                    white();
                }
            }
            error("Bad object");
        };

	// Parse a JSON value. It could be an object, an array, a string, a number,
	// or a word.

    value = function ()
	{
        white();
        switch (ch) 
		{
			case '{':
				return object();
			case '[':
				return array();
			case qc:
				return string();
			case '-':
				return number();
			default:
				return ch >= '0' && ch <= '9' ? number() : word();
        }
    };

// Return the json_parse function. It will have access to all of the above
// functions and variables.

    return function (source, reviver) 
	{
        var result;

        text = source;
        at = 0;
        ch = ' ';
        result = value();
        white();
        if (ch) 
		{
            error("Syntax error");
        }

// If there is a reviver function, we recursively walk the new structure,
// passing each name/value pair to the reviver function for possible
// transformation, starting with a temporary root object that holds the result
// in an empty key. If there is not a reviver function, we simply return the
// result.

        return typeof reviver === 'function'? (function walk(holder, key) 
		{
                var k, v, value = holder[key];
                if (value && typeof value === 'object') 
				{
                    for (k in value) 
					{
                        if (Object.prototype.hasOwnProperty.call(value, k)) 
						{
                            v = walk(value, k);
                            if (v !== undefined) 
							{
                                value[k] = v;
                            } 
							else 
							{
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }({'': result}, ''))
            : result;
    };
}());
