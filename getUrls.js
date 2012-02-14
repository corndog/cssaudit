/*
 * Load urls from command line params, either the url(s) themselves or a file
 */

fs = fs || require('fs');  // let's load it on main page for now

var urlsFile;

var getUrls = function() {
	//console.log("getting urls");
	var urls = [];
	// plan is to take any number command line args of either urls starting with http, or filenames...tbc
	if (phantom.args.length < 1) {
		console.log("usage: phantomjs filename.txt (file with urls) or phantomjs http://x http://y ... etc");
		phantom.exit();
	}
	// process command line args, urls starting with http and/or filenames, file contains urls each on a new line
	// this info will seed the crawler
	else {

		phantom.args.forEach(function(arg){
			
			if (arg.match('/^--/') ) {
				// ignore, its an arg for phantom
				// actually I think phantom has already eaten it, oh well
			}
			else if ( arg.match(/http:/) ) {
				urls.push(arg);
			}
			else {
				urlsFile = fs.read(arg);
				(urlsFile.split("\n")).forEach(function(url){
					console.log("found " + url);
					urls.push(url);
				});
			}
		});
	}
	urls.forEach(function(url) {console.log(url);});
	
	return urls;
};

