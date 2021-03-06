/*\
title: $:/plugins/commons/file-uploads-fission/uploader.js
type: application/javascript
module-type: uploader

Handles uploading to Fission Webnative filing system

\*/
(function(){


/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.name = "fission";

var fissionUserName;

exports.create = function(params) {
	//webnativeDetails does not provide access to webnative.path.file() and authenticatedUsername()
	var webnativeDetails = window.webnativeDetails || window.parent && window.parent.webnativeDetails,
		webnative = window.webnative || window.parent && window.parent.webnative;
	if(webnative && webnativeDetails && webnativeDetails.fs) {
		if(!fissionUserName) {
			webnative.authenticatedUsername().then(result => {fissionUserName = result});
		}
		return new FissionUploader(params,webnative,webnativeDetails.fs);
	}
	params.logger.alert("Fission uploader could not be initialized. \n Webnative is not available, are you using ~TiddlyWiki on Fission?");
	return null;
};

function FissionUploader(params,webnative,fs) {
	var self = this;
	this.webnative = webnative;
	this.params = params || {};
	this.logger = new $tw.utils.Logger("fission-uploader");
	this.fs = fs;
	this.outputBasePath = ["public"];
	var uploadFolder = $tw.wiki.getTiddlerText("$:/config/file-uploads/fission/uploadpath","files").trim().replace(/^\/|\/$/gm,"");
	var uploadPath = uploadFolder.split("/");
	$tw.utils.each(uploadPath,function(folder){
		self.outputBasePath.push(folder);
	})
	this.logger.log("FissionUploader",params);
};

FissionUploader.prototype.initialize = function(callback) {
	this.logger.log("uploader initialize");
	callback();
};

// Converts base64 data into a form accepted by the backend for saving
FissionUploader.prototype._prepareUploadData = function (uploadItem) {
	if(uploadItem.isBase64) {
		return uploadItem.getUint8Array();
	} else {
		return uploadItem.text;
	}
};

// Returns the canonical_uri for a file that has been uploaded
async function getCanonicalURI(uploadItem,uploader) {
	const uriType = $tw.wiki.getTiddlerText("$:/config/file-uploads/fission/canonical-uri-type","public").trim();
	var filePath = uploader.outputBasePath.slice(1);
	filePath.push(uploadItem.filename);
	if(uriType === "public") {
		return `https://${fissionUserName}.files.fission.name/p/${filePath.join("/")}`;		
	} else {
		const ipfsGateway = $tw.wiki.getTiddlerText("$:/config/file-uploads/fission/ipfs-gateway","ipfs.runfission.com").trim();
		const rootCid = await uploader.fs.root.put();
		const ipfs = await uploader.webnative.ipfs.get();
		const { cid } = await ipfs.files.stat(`/ipfs/${rootCid}/p/${filePath.join("/")}`);
		return `https://${ipfsGateway}/ipfs/${cid.toBaseEncodedString()}`;
	}
}

// Returns the path object representing the path to which the file will be saved
FissionUploader.prototype._getUploadPath = function(uploadItem) {
	var pathParams = this.outputBasePath.slice();
	pathParams.splice(pathParams.length,0,uploadItem.filename);
	return this.webnative.path.file.apply(null,pathParams);
};

/*
Arguments:
uploadItem: object of type UploadItem representing tiddler to be uploaded
callback accepts two arguments:
	err: error object if there was an error
	uploadItemInfo: object corresponding to the tiddler being uploaded with the following properties set:
	- title
	- canonical_uri (if available)
	- fields (optional)
	- uploadComplete (boolean)
	- getUint8Array()
	- getBlob()
*/
FissionUploader.prototype.uploadFile = function(uploadItem,callback) {  
	var self = this,
		path = this._getUploadPath(uploadItem),
		uploadInfo = { title: uploadItem.title };
	self.fs.add(path,self._prepareUploadData(uploadItem)).then(function() {
		return getCanonicalURI(uploadItem,self);
	}).then(function(canonical_uri) {
		self.logger.log(`Saved to ${path.file.join("/")} with canonical_uri ${canonical_uri}`);
		 // Set the canonical_uri
		uploadInfo.canonical_uri = canonical_uri;
		// Set updateProgress to true if the progress bar should be updated
		// For some uploaders where the data is just being added to the payload with no uploading taking place we may not want to update the progress bar
		uploadInfo.updateProgress = true;
		// Set uploadComplete to true if the uploaded file has been persisted and is available at the canonical_uri
		// This flag triggers the creation of a canonical_uri tiddler corresponding to the uploaded file
		// Here we set uploadComplete to false since with Fission the file uploaded will not be persisted until we call publish()
		uploadInfo.uploadComplete = false;
		callback(null,uploadInfo);
	}).catch(function(err) {
		self.logger.alert(`Error saving file ${path.file.join("/")} to fission: ${err}`);
		callback(err,uploadInfo);
	});
};

/*
Arguments:
callback accepts two arguments:
	err: error object if there was an error
	uploadInfoArray (optional): array of uploadInfo objects corresponding to the tiddlers that have been uploaded
		this is needed and should set the canonical_uri for each uploadItem if:
		- (a) uploadInfo.uploadComplete was not set to true in uploadFile AND 
		- (b) uploadInfo.canonical_uri was not set in uploadFile
*/
FissionUploader.prototype.deinitialize = function(callback) {
	var self = this;
	this.fs.publish().then(function() {
		self.logger.log("uploader deinitialize");
		callback();
	}).catch(function(err) {
		self.logger.alert(`Error uploading to fission: ${err} in uploader deinitialize`);
		callback(err);
	});
};

})();
