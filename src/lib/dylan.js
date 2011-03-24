CodeMirror.defineMode("dylan", function(config, parserConfig) {

    // states: in-prologe, in-code

    //// Words
    var words = {
	// Words that introduce unnamed definitions like "define interface"
	unnamedDefinition: ['interface'],

	// Words that introduce simple named definitions like "define library"
	namedDefinition: ['module', 'library', 'macro',
			  'C-struct', 'C-union',
			  'C-function', 'C-callable-wrapper'],

	// Words that introduce type definitions like "define class".
	// These are also parameterized like "define method" and are
	// appended to otherParameterizedDefinitionWords
	typeParameterizedDefinition: ['class', 'C-subtype', 'C-mapped-subtype'],

	// Words that introduce trickier definitions like "define method".
	// These require special definitions to be added to startExpressions
	otherParameterizedDefinition: ['method', 'function',
				       'C-variable', 'C-address'],

	// Words that introduce module constant definitions.
	// These must also be simple definitions and are
	// appended to otherSimpleDefinitionWords
	constantSimpleDefinition: ['constant'],

	// Words that introduce module variable definitions.
	// These must also be simple definitions and are
	// appended to otherSimpleDefinitionWords
	variableSimpleDefinition: ['variable'],

	// Other words that introduce simple definitions
	// (without implicit bodies).
	otherSimpleDefinition: ['generic', 'domain',
				'C-pointer-type',
				'table'],

	// Words that begin statements with implicit bodies.
	statement: ['if', 'block', 'begin', 'method', 'case',
		    'for', 'select', 'when', 'unless', 'until',
		    'while', 'iterate', 'profiling'],

	// Patterns that act as separators in compound statements.
	// This may include any general pattern that must be indented
	// specially.
	separator: ['finally', 'exception', 'cleanup', 'else',
		    'elseif', 'afterwards'],

	// Keywords that do not require special indentation handling,
	// but which should be highlighted
	other: ['above', 'below', 'by', 'from', 'handler', 'in',
		'instance', 'let', 'local', 'otherwise', 'slot',
		'subclass', 'then', 'to', 'keyed-by', 'virtual'],

	hash: ['rest', 'key', 'all-keys', 'next'],

	// Condition signaling function calls
	signalingCalls: ['signal', 'error', 'cerror',
			 'break', 'check-type', 'abort']
    };

    words['otherDefinition'] =
	words['unnamedDefinition']
	.concat(words['namedDefinition'])
	.concat(words['otherParameterizedDefinition']);

    words['definition'] =
	words['typeParameterizedDefinition']
	.concat(words['otherDefinition']);

    words['parameterizedDefinition'] =
	words['typeParameterizedDefinition']
	.concat(words['otherParameterizedDefinition']);

    words['simpleDefinition'] =
	words['constantSimpleDefinition']
	.concat(words['variableSimpleDefinition'])
	.concat(words['otherSimpleDefinition']);

    //// Patterns
    var symbolPattern = "[-_a-zA-Z?!*@<>$%]+"
    var patterns = {
	// keyword
	headerKeyword: ("^\(?:([a-zA-Z][-a-zA-Z0-9]*:)|[ \t])"
			+ "([ \t]*)([^ \t\n][^\n]*?)\n"),

	// Symbols with keyword syntax
	symbolKeyword: "^" + symbolPattern + ":",

	// Symbols with class syntax
	symbolClass: "^<" + symbolPattern + ">",

	// Symbols with string syntax
	symbolString: /^#"[^\"]*"/,

	// Logical negation operator
	// TODO: "~"
    };

    // Names beginning "with-" and "without-" are commonly
    // used as statement macro
    var withStatementPrefix = /with(out)?-/;
    var statementPrefixes =
	"|\\b" + withStatementPrefix + "[-_a-zA-Z?!*@<>$%]+";

    // Compile all patterns to regular expressions
    for (var patternName in patterns)
	if (patterns.hasOwnProperty(patternName))
	    patterns[patternName] = new RegExp(patterns[patternName]);


    function chain (stream, state, f) {
	state.tokenize = f;
	return f(stream, state);
    }

    var type, content;
    function ret (_type, style, _content) {
	type = _type; content = _content;
	return 'dylan-' + (style || _type);
    }

    function tokenBase (stream, state) {
	// String
	var ch = stream.next();
	if (ch == '"' || ch == "'")
	    return chain(stream, state, tokenString(ch));
	// Comment
	else if (ch == "/") {
	    if (stream.eat("*")) {
		return chain(stream, state, tokenComment);
	    }
	    else if (stream.eat("/")) {
		stream.skipToEnd();
		return ret("comment");
	    }
	    else {
		stream.skipTo(" ");
		return ret("operator");
	    }
	}
	// TODO: define -> definition, primary
	// TODO: end -> while ch <> ';' OR
	//       in words['definition'].concat(words['statement']) ?!
	stream.backUp(1);
	for (name in patterns) {
	    if (patterns.hasOwnProperty(name)
		&& stream.match(patterns[name]))
	    {
		return ret(name, null, stream.current());
	    }
	}
	stream.next();
        return ret("variable");
    }

    function tokenComment(stream, state) {
	var maybeEnd = false, ch;
	while (ch = stream.next()) {
	    if (ch == "/" && maybeEnd) {
		state.tokenize = tokenBase;
		break;
	    }
	    maybeEnd = (ch == "*");
	}
	return ret("comment");
    }

    function tokenString (quote) {
	return function (stream, state) {
	    var next, end = false;
	    while ((next = stream.next()) != null) {
		if (next == quote) {
		    end = true;
		    break;
		}
	    }
	    if (end)
		state.tokenize = tokenBase;
	    return ret("string");
	};
    }

    // Interface
    return {
	startState: function (baseColumn) {
	    return {tokenize: tokenBase};
	},
	copyState: function (state) {
	    return {tokenize: state.tokenize};
	},
	token: function (stream, state) {
	    if (stream.eatSpace())
		return null;
	    var style = state.tokenize(stream, state);
//	    console.log(type);
	    return style;
	}
    }
});

CodeMirror.defineMIME("text/x-dylan", "dylan");
