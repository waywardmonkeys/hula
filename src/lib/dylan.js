CodeMirror.defineMode("dylan", function(config, parserConfig) {

    // Build a search pattern that matches any of the patterns
    // passed to it. Makes sure that it doesn't match partial words.
    function makePattern (words) {
	function makeWordPattern (word) {
	    return "\\b" + word + "\\b";
	}
	return words.map(makeWordPattern).join("|");
    }

    function makeWordsPattern (words) {
	return "(" + makePattern(words) + ")";
    }

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

    var patterns = {
	// Regexp pattern that matches 'define' and adjectives.
	// A sub-pattern designed to be followed by patterns that match
	// the define word or other parts of the definition macro call.
	define: "define([ \t]+\\w+)*[ \t]+",

	// Internal pattern for finding comments in Dylan code.
	// Currently only handles end-of-line comments.
	comment: "//.*$",

	// keyword
	headerKeyword: ("^\(?:([a-zA-Z][-a-zA-Z0-9]*:)|[ \t])"
			+ "([ \t]*)([^ \t\n][^\n]*?)\n")
    };

    // Generate patterns for words
    patterns['typeDefinition'] =
	makeWordsPattern(words['typeParameterizedDefinition']);

    ['otherDefinition', 'definition', 'namedDefinition',
     'unnamedDefinition', 'typeParameterizedDefinition',
     'parameterizedDefinition','constantSimpleDefinition',
     'variableSimpleDefinition', 'otherSimpleDefinition',
	  'simpleDefinition']
	.forEach(function (id) {
	    patterns[id] = makeWordsPattern(words[id]);
	});

    // Names beginning "with-" and "without-" are commonly
    // used as statement macro
    var withStatementPrefix = /with(out)?-/;
    var statementPrefixes =
	"|\\b" + withStatementPrefix + "[-_a-zA-Z?!*@<>$%]+";

    // We disallow newlines in "define foo" patterns because it allows
    // the actual keyword to be confused for a qualifier if another
    // definition follows closely.
    patterns['keyword'] =
	makePattern([patterns['define'] + patterns['definition']]
		    .concat(words['statement']))
	+ statementPrefixes;

    // We intentionally disallow newlines in "end foo" constructs,
    // because doing so makes it very difficult to deal with the
    // keyword "end" in comments.
    patterns['endKeyword'] =
	"\\bend\\b[ \t]*("
	+ makePattern(words['definition'].concat(words['statement']))
	+ statementPrefixes
	+ ")?";

    patterns['defineMethod'] =
	"(" + patterns['define'] + ")?"
	+ "(method|function)[ \t\n]+[^( ]*[ \t\n]*";

    patterns['separator'] =
	makePattern(words['separator']);

    patterns['other'] =
	makePattern(["define([ \t\n]+\\w+)*[ \t\n]+"
		     + patterns['simpleDefinition']]
		    .concat(words['other']));

    // Compile all patterns to regular expressions
    for (var patternName in patterns)
	if (patterns.hasOwnProperty(patternName))
	    patterns[patternName] = new RegExp(patterns[patternName]);

    // Patterns that match that portion of a compound statement
    // that precedes the body. This is used to determine where
    // the first statement begins for indentation purposes.
    // Contains a list of patterns, each of which is either a regular
    // expression or a list of regular expressions.
    // A set of balanced parens will be matched between each
    // list element.
    var startExpressions =
	(words['statement']
	 .map(function (statement) {
	     return [statement + "[ \t\n]*", ""];
	 }))
	.concat(["begin",
		 "case",
		 // special patterns for "define method", which is funky
		 [patterns['defineMethod'], "[ \t\n]*=>[^;)]+;?"],
		 [patterns['defineMethod'], "[ \t\n]*;?"],
		 ("define[ \t]+"
		  + patterns['namedDefinition']
		       + "[ \t\n]+[^ \t\n]+"),
		 ("define[ \t]+"
		  + patterns['unnamedDefinition']),
		 [("(" + patterns['define'] + ")?"
		   + patterns['parameterizedDefinition'],
		   + "[ \t\n]+[^\( ]*[ \t\n]*"),
		  ""],
	 	 // Since we don't know the syntax of all the "with(out)-" macros,
		 // just assume that the user has already split the line at
		 // the end of the header.
		 (withStatementPrefix + "[^\n]*"),
		 "[[({]"]);

    function chain (stream, state, f) {
	state.tokenize = f;
	return f(stream, state);
    }

    var type;
    function ret (_type, style) {
	type = _type;
	return 'dylan-' + (style || _type);
    }

    function tokenBase (stream, state) {
	var ch = stream.next();
	if (ch == '"' || ch == "'")
	    return chain(stream, state, tokenString(ch));
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
	return ret()
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
	    console.log(type);
	    return style;
	}
    }
});

CodeMirror.defineMIME("text/x-dylan", "dylan");
