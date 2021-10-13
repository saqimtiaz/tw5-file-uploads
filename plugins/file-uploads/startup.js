/*\
title: $:/plugins/commons/file-uploads/startup.js
type: application/javascript
module-type: startup
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.name = "upload-handler";
exports.platforms = ["browser"];
exports.after = ["startup"];

exports.startup = function() {
	$tw.uploadHandler = new $tw.UploadHandler({
		wiki: $tw.wiki
	});
};

})();
