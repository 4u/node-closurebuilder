var fs = require('fs');

var Source = require('./source');
var utils = require('./utils');


/**
 * @param {string} file
 * @constructor
 */
var Cache = module.exports = function(file) {
  /** @type {string} */
  this.file = file;
  /** @private {Object.<Source>} */
  this._sourcesMap = {};
  /** @private {Object.<string>} */
  this._modifiedDates = {};

  try {
    if (fs.existsSync(file)) {
      var content = fs.readFileSync(file, 'utf8');
      var json = JSON.parse(content);

      if ('object' == typeof json) {
        for (var jsFile in json) {
          var jsonSource = json[jsFile];

          if (
            jsonSource.provides &&
            jsonSource.requires &&
            jsonSource.modifiedDates
          ) {
            this._sourcesMap[jsFile] = new Source(
              jsFile, jsonSource.provides, jsonSource.requires,
              !!jsonSource.isModule, null);
            this._modifiedDates[jsFile] = jsonSource.modifiedDates;
          }
        }
      }
    }
  } catch (e) { }
};


/**
 * @param {string} path
 * @return {Source}
 */
Cache.prototype.getSource = function(path) {
  if (this._sourcesMap[path]) {
    if (this._modifiedDates[path] == (+fs.statSync(path).mtime)) {
      return this._sourcesMap[path];
    }

    this.removeSource(path);
  }

  return null;
};

/**
 * @param {string} path
 */
Cache.prototype.removeSource = function(path) {
  delete this._modifiedDates[path];
  delete this._sourcesMap[path];
};

/**
 * @param {string} path
 * @param {Source} source
 */
Cache.prototype.setSource = function(path, source) {
  this._sourcesMap[path] = source;
};

/**
 * @param {function(Error)=} opt_callback
 */
Cache.prototype.save = function(opt_callback) {
  var json = {};

  for (var jsFile in this._sourcesMap) {
    if (fs.existsSync(jsFile)) {
      json[jsFile] = {
        isModule: this._sourcesMap[jsFile].isModule,
        modifiedDates: +fs.statSync(jsFile).mtime,
        provides: this._sourcesMap[jsFile].provides,
        requires: this._sourcesMap[jsFile].requires
      };
    }
  }

  utils.writeFile(JSON.stringify(json), this.file, opt_callback);
};
