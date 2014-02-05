var fs = require('fs');
var mkdirp = require('mkdirp');

var exists = fs.existsSync;

module.exports = {
  ensureDir: mkdirp.sync,
  isDir: function(path) {
    if(!exists(path)) {
      return false;
    }
    var pathStats = fs.statSync(path);
    return pathStats.isDirectory();
  },
  isFile: function(path) {
    if(!exists(path)) {
      return false;
    }
    var pathStats = fs.statSync(path);
    return pathStats.isFile();
  }
};
