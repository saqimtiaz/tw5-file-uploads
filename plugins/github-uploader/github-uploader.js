/*\
title: $:/plugins/tiddlywiki/file-uploads-github/uploader.js
type: application/javascript
module-type: uploader

Handles uploading files to Github
Uses the username, repository and access token from the Github saver
File sare saved to the "files" directory in the root of repository, existing files are overwritten.

\*/
(function(){


/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.name = "github";

'use strict';

var Octokat = require("$:/plugins/tiddlywiki/file-uploads-github/octokat.js");

var defaults = {
	branchName: 'main',
	token: '',
	username: '',
	reponame: ''
};

//Adapted from https://gist.github.com/StephanHoyer/91d8175507fcae8fb31a
function github(options) {
	options = Object.assign({}, defaults, options);
	var head;

	var octo = new Octokat({
		token: options.token
	});
	var repo = octo.repos(options.username, options.reponame);

	function fetchHead() {
		return repo.git.refs.heads(options.branchName).fetch();
	}

	function fetchTree() {
		return fetchHead().then(function(commit) {
			head = commit;
			return repo.git.trees(commit.object.sha).fetch();
		});
	}

	function commit(files, message) {
		return Promise.all(files.map(function(file) {
			return repo.git.blobs.create({
			content: file.content,
			encoding: file.encoding || 'utf-8'
			});
		})).then(function(blobs) {
			return fetchTree().then(function(tree) {
			return repo.git.trees.create({
				tree: files.map(function(file, index) {
				return {
					path: file.path,
					mode: '100644',
					type: 'blob',
					sha: blobs[index].sha
				};
				}),
				base_tree: tree.sha
			});
			});
		}).then(function(tree) {
			return repo.git.commits.create({
			message: message,
			tree: tree.sha,
			parents: [
				head.object.sha
			]
			});
		}).then(function(commit) {
			return repo.git.refs.heads(options.branchName).update({
			sha: commit.sha
			});
		});
	}

	return {
	commit: commit
	};
}

exports.create = function(params) {
	var githubInfo = {
		username: $tw.wiki.getTiddlerText("$:/GitHub/Username","").trim(),
		//To Do: $:/Github/Repo has target repository in the form Username/Reponame and we need only the repo
		reponame: $tw.wiki.getTiddlerText("$:/GitHub/Repo","").trim(),
		token: ($tw.utils.getPassword("github") || "").trim()
	}
	if(!githubInfo.username || !githubInfo.reponame || !githubInfo.token) {
		//alert("Github repository details are not properly configured. Cannot upload files.");
		params.logger.alert("Github repository details are not properly configured. Cannot upload files.");
		return null;
	}
	return new GithubUploader(params,githubInfo);
};

function GithubUploader(params,githubInfo) {
	this.params = params || {};
	this.githubInfo = githubInfo;
	this.logger = new $tw.utils.Logger("github-uploader");
	this.files = [];
	this.logger.log("GithubUploader",params);
};

GithubUploader.prototype.initialize = function(callback) {
	this.logger.log("uploader initialize");
	callback();
};

// Returns the canonical_uri for a file that has been uploaded
GithubUploader.prototype._getCanonicalURI = function(uploadItem) {
	return `https://${this.githubInfo.username}.github.io/${this.githubInfo.reponame}/${this._getFilePath()}/${uploadItem.filename}`;
};

GithubUploader.prototype._getFilePath = function() {
	return $tw.wiki.getTiddlerText("$:/config/file-uploads/github/uploadpath","files").trim().replace(/^\/|\/$/gm,"");
};

/*
Arguments:
uploadItem: object representing tiddler to be uploaded
callback accepts two arguments:
	err: error object if there was an error
	uploadItemInfo: object corresponding to the tiddler being uploaded with the following properties set:
	- title
	- canonical_uri (if available)
	- uploadComplete (boolean)
*/
GithubUploader.prototype.uploadFile = function(uploadItem,callback) {  
	var self = this,
		uploadInfo = { title: uploadItem.title };
	this.files.push({
		path: `${this._getFilePath()}/${uploadItem.filename}`,
		content: uploadItem.text,
		encoding: uploadItem.isBase64 ? "base64" : "utf8"
	});		
	var canonical_uri = this._getCanonicalURI(uploadItem);
	// Set the canonical_uri if available 
	uploadInfo.canonical_uri = canonical_uri;
	// Set uploadComplete to true if the uploaded file has been persisted and is available at the canonical_uri
	// This flag triggers the creation of a canonical_uri tiddler corresponding to the uploaded file
	uploadInfo.uploadComplete = false;
	callback(null,uploadInfo);
};

/*
Arguments:
callback accepts two arguments:
	status: true if there was no error, otherwise false
	uploadInfoArray (optional): array of uploadInfo objects corresponding to the tiddlers that have been uploaded
		this is needed and should set the canonical_uri for each uploadItem if:
		- (a) uploadInfo.uploadComplete was not set to true in uploadFile AND 
		- (b) uploadInfo.canonical_uri was not set in uploadFile
*/
GithubUploader.prototype.deinitialize = function(callback) {
	var self = this;
	this.logger.log("uploader deinitialize",this.files);
	var api = github(this.githubInfo);
	api.commit(this.files,"Uploaded by TiddlyWiki")
		.then(() => callback())
		.catch((err) => {
			self.logger.alert("`Error uploading to github: ${err} in uploader deinitialize`");
			callback(err);
		});
};

})();
