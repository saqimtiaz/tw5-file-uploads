In development plugin for [TiddlyWiki5](https://github.com/Jermolene/TiddlyWiki5) that uploads binary tiddlers to external storage and creates canonical_uri tiddlers in their stead.
The File Uploads plugin supports multiple pluggable storage backends via uploader modules:

* Fission Webnative
* Github (experimental)
* others hopefully to be added such as Amazon S3, nodejs, Imgur etc.

The plugin itself includes a "dummy" uploader module which implements the interface required of uploader modules but just mocks uploading by logging to the browser developer console.

The development of this plugin and the uploader modules is being funded via [OpenCollective](https://opencollective.com/tiddlywiki-on-fission/projects/tiddlywiki-file-upload)