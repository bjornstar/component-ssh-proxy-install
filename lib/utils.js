var fs = require('fs');
var mkdirp = require('mkdirp');

function exists(path) {
  return fs.existsSync(path);
}

module.exports = {
  getUserHome: function() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  },
  ensureDir: function(path) {
    mkdirp.sync(path);
  },
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
}
