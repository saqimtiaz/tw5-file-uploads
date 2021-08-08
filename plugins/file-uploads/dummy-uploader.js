/*\
title: $:/plugins/tiddlywiki/file-uploads/dummy-uploader.js
type: application/javascript
module-type: uploader

Mocks uploading to Fission Webnative filing system
Useful for testing the upload mechanism without uploading anything

\*/
(function(){


/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.name = "dummy";

var DummyUserName;

exports.create = function(params) {
	return new DummyUploader(params);
};

function DummyUploader(params) {
	this.params = params || {};
	this.items = [];
	this.logger = new $tw.utils.Logger("dummy-uploader");
	this.logger.log("DummyUploader",params);
};

DummyUploader.prototype.initialize = function(callback) {
	this.logger.log("uploader initialize");
	callback();
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
DummyUploader.prototype.uploadFile = function(uploadItem,callback) {  
	var self = this,
		uploadInfo = { title: uploadItem.title };
	//this.items.push(uploadItem);
	// Mock uploading the file by logging to console.
	this.logger.log(`Saved ${uploadItem.title}`);
	var canonical_uri = `https://myusername.files.fission.name/p/${uploadItem.filename}`
	// Set the canonical_uri if available 
	uploadInfo.canonical_uri = canonical_uri;
	// Set updateProgress to true if the progress bar should be updated
	// For some uploaders where the data is just being added to the payload with no uploading taking place we may not want to update the progress bar
	uploadInfo.updateProgress = true;
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
DummyUploader.prototype.deinitialize = function(callback) {
	// Mock finishing up operations that will complete the upload and persist the files
	this.logger.log("uploader deinitialize");
	callback();
};

})();
