/**
 * Scans a source JS file for its provided and required namespaces.
 *
 * Simple class to scan a JavaScript file and express its dependencies.
 */

var esprima = require('esprima');
var fs = require('fs');


/**
 * Matches a multiline comment.
 * Note: We can't definitively distinguish a "/*" in a string literal without a
 * state machine tokenizer. We'll assume that a line starting with whitespace
 * and "/*" is a comment.
 * @const {RegExp}
 */
var COMMENT_REGEX = new RegExp('/\\*[\\s\\S]*?\\*/', 'gm');

/**
 * Scans a JavaScript source for its provided and required namespaces.
 *
 * @param {string} path Path to a JavaScript file.
 * @param {Array.<string>} provides
 * @param {Array.<string>} requires
 * @param {boolean} isModule
 * @param {Object} syntaxTree
 * @constructor
 */
var Source = module.exports = function(path, provides, requires, isModule,
    syntaxTree) {
  /** @type {boolean} */
  this.isModule = isModule;
  /** @type {!Array.<string>} */
  this.provides = provides || [];
  /** @type {!Array.<string>} */
  this.requires = requires || [];
  /** @type (string) */
  this.path = path;
  /** @type {Object} */
  this.syntaxTree = syntaxTree;
};

/**
 * @param {string} path
 * @param {boolean} opt_saveSyntaxTree
 * @return {!Source}
 */
Source.createFromFile = function(path, opt_saveSyntaxTree) {
  var source;
  var syntaxTree = null;
  var tokens;
  var provides = [];
  var requires = [];
  var isModule = false;

  try {
    source = fs.readFileSync(path, 'utf8');

    if (opt_saveSyntaxTree) {
      syntaxTree = esprima.parse(source, {
        comment: true,
        tokens: true
      });

      if (syntaxTree) {
        syntaxTree.body = null;
      }
    }

    tokens = esprima.tokenize(source);
  } catch (e) {
    console.error(path);

    throw e;
  }

  if (tokens) {
    var testOnly = false;

    for (var i = 4; i < tokens.length; i++) {
      if (
        'String' == tokens[i].type &&
        'Punctuator' == tokens[i - 1].type && '(' == tokens[i - 1].value &&
        'Identifier' == tokens[i - 2].type &&
        'Punctuator' == tokens[i - 3].type && '.' == tokens[i - 3].value &&
        'Identifier' == tokens[i - 4].type && 'goog' == tokens[i - 4].value &&
        'setTestOnly' == tokens[i - 2].value
      ) {
        testOnly = true;
        break;
      }
    }

    if (!testOnly) {
      for (var i = 4; i < tokens.length; i++) {
        if (
          'String' == tokens[i].type &&
          'Punctuator' == tokens[i - 1].type && '(' == tokens[i - 1].value &&
          'Identifier' == tokens[i - 2].type &&
          'Punctuator' == tokens[i - 3].type && '.' == tokens[i - 3].value &&
          'Identifier' == tokens[i - 4].type && 'goog' == tokens[i - 4].value
        ) {
          if ('provide' == tokens[i - 2].value) {
            provides.push(
              tokens[i].value.substr(1, tokens[i].value.length - 2));
          } else if ('module' == tokens[i - 2].value) {
            provides.push(
              tokens[i].value.substr(1, tokens[i].value.length - 2));
            isModule = true;
          } else if ('require' == tokens[i - 2].value) {
            requires.push(
              tokens[i].value.substr(1, tokens[i].value.length - 2));
          }
        }
      }
    }
  }

  // Closure's base file implicitly provides 'goog'.
  // This is indicated with the @provideGoog flag.
  if (Source.hasProvideGoogFlag(source)) {
    provides.push('goog');
  }

  return new Source(path, provides, requires, isModule, syntaxTree);
};

/**
 * Determines whether the @provideGoog flag is in a comment.
 * @param {string} source
 * @return {boolean}
 */
Source.hasProvideGoogFlag = function(source) {
  var match;

  while (match = COMMENT_REGEX.exec(source)) {
    if (-1 < match[0].indexOf('@provideGoog')) {
      return true;
    }
  }

  return false;
};


/**
 * @return {string}
 */
Source.prototype.toString = function() {
  return 'Source ' + this.path;
};
