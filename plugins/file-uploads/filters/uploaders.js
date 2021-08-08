/*\
title: $:/plugins/tiddlywiki/file-uploads/filters/uploaders.js
type: application/javascript
module-type: filteroperator

Filter operator for returning the names of the uploaders in this wiki

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Export our filter function
*/
exports.uploaders = function(source,operator,options) {
	var results = [];
	$tw.modules.forEachModuleOfType("uploader",function(title,module) {
		if(module.name) {
			results.push(module.name);
		}
	});
	results.sort();
	return results;
};

})();
