var crypto = require('crypto'),
	exec = require('child_process').exec,
	express = require('express'),
	fs = require('fs'),
	mime = require('mime'),
	os = require('os'),
	path = require('path'),
	rimraf = require('rimraf'),
	util = require('util'),
	utils = require('./utils');

var CLONE_COMMAND = 'git clone git@github.com:%s/%s.git';
var UPDATE_COMMAND = 'git pull origin %s';
var CHECKOUT_COMMAND = 'git checkout %s';

function newId() {
	return crypto.randomBytes(8).toString('hex');
}

var componentsPath = path.resolve(os.tmpdir(), newId());

/**
 * Clone the repository
 */
function cloneRepo(userDir, user, repo, tree, callback) {
	console.log('     cloning : %s/%s', user, repo);
	// Clone the repo or fail
	var command = util.format(CLONE_COMMAND, user, repo);
	exec(command, { cwd: userDir }, function(err, stdout, stderr) {
		if(err) {
			if(stderr.indexOf('Repository not found.') !== -1) {
				var notFound = new Error('Repository not found');
				notFound.name = 'NotFound';
				return callback(notFound);
			}
			return callback(err);
		}
		checkoutRepoTree(userDir, user, repo, tree, callback);
	});
}

/**
 * Update the repository
 */
function updateRepo(userDir, user, repo, tree, callback) {
	console.log('    updating : %s/%s', user, repo);
	var command = util.format(UPDATE_COMMAND, tree);
	var repoDir = path.resolve(userDir, repo);
	exec(command, { cwd: repoDir }, function(err, stdout, stderr) {
		if(err) {
			return callback(err);
		}
		checkoutRepoTree(userDir, user, repo, tree, callback);
	});
}

/**
 * Checkout the repository's tree
 */
function checkoutRepoTree(userDir, user, repo, tree, callback) {
	var repoDir = path.resolve(userDir, repo);
	var command = util.format(CHECKOUT_COMMAND, tree);
	exec(command, { cwd: repoDir }, function(err, stdout, stderr) {
		if(err) {
			if(stderr.indexOf('did not match any file(s)') !== -1) {
				var notFound = new Error('Tree not found');
				notFound.name = 'NotFound';
				return callback(notFound);
			}
			return callback(err);
		}
		callback();
	});
}

/**
 * Serve a file from a repo
 */
function serveFile(fileToServe, res) {
	if(!utils.isFile(fileToServe)) {
		return res.send(404, 'File not found');
	}

	res.type(mime.lookup(fileToServe));

	fs.readFile(fileToServe, function (err, data) {
		if (err) {
			return res.send(404, 'File not found');
		}

		res.send(200, data);
	});
}

var app = express();

app.get('/:user/:repo/:tree/*', function(req, res) {
	var user = req.params.user,
		repo = req.params.repo,
		tree = req.params.tree; // Branch/tag/commit

	var userDir = path.resolve(componentsPath, user),
		repoDir = path.resolve(userDir, repo);

	var repoKey = util.format('%s/%s', user, repo);
	var filePath = req.params[0];
	var fileToServe = path.join(userDir, repo, filePath);

	// Check if the repo exists
	if(utils.isDir(repoDir)) {
		return serveFile(fileToServe, res);
	}

	// Create the user directory
	utils.ensureDir(userDir);

	cloneRepo(userDir, user, repo, tree, function(err) {
		if(err) {
			console.error(err);
			if(err.name == 'NotFound') {
				return res.send(404, 'Repo not found');
			}
			return res.send(500, 'Internal Server Error');
		}
		// Serve the requested file

		serveFile(fileToServe, res);
	});
});

var server;

exports.start = function () {
	utils.ensureDir(componentsPath);
	server = app.listen(0);
};

exports.getPort = function () {
	return server.address().port;
};

exports.stop = function (cb) {
	rimraf(componentsPath, function(error) {
		if (error) {
			console.warn('error while removing temp dir:', error);
		}

		server.close();
		cb();
	});
};
