"use strict"; 

/* Analyse/crawl your website and see how much css gets used.
 *
 * problems: it occassionally dies on fxbml tags not rendering, can I catch an exception somewhere?
 *
 * use notes: if you need cookies - accessing an authed page, need to remember to delete old cookie file first
 * something gets borked if you don't
 *
 * Idea is to collect the data in a big js object, then write it to a file as JSON.
 * Then we can a webpage/pages that read this data, providing a view interface.
 * 
 * to allow cross-domain xhr --web-security=no
 *
 */
var fs = require('fs');
phantom.injectJs('stats.js'); // reduce, printResults
phantom.injectJs('auditor.js'); // auditor
phantom.injectJs('utils.js'); // getUrls, login


var urls, crawl = false;
// bookkeeping
var summary = {}, alreadyInQueue = {}, dataRoot = "data.js"; // file to write the data to, as JSON/js
// hacky stuff to limit it to a few pages at a time
var numPagesVisited = 0, maxPages = 10;

// processes command line to collect urls from command line or file
urls = getUrls();

if (!urls || urls.length == 0) {
	console.log("No urls, nothing to do");
	phantom.exit();
}
else {
	urls.forEach(function(url){
		alreadyInQueue[url] = true; // so we don't add them again if we are crawling
	});
}

// get phantom to create page
var page = require('webpage').create();

page.onConsoleMessage = function(msg) {
	console.log(msg);
};

// for pages we want to audit css
var doOnLoad = function(status) {

	var resp;
	console.log("page loaded");
	
	if (status !== 'success') {
		console.log("something went wrong with this page " + status);
		phantom.exit();
	}
	else {
		resp = page.evaluate(auditor);
		numPagesVisited++;
		reduce(summary, resp.results);
		
		if (crawl) {
			resp.pages.forEach(function(page) {
				if (!alreadyInQueue[page] ) {
					urls.push(page);
					alreadyInQueue[page] = true;
				}
			});
		}
	  	process(); // do it all again, recursion keeps it sequential
    }
};


var process = function process() {
  
	var url = (urls.length > 0 ? urls.shift() : false), 
		needsLogin = ( url &&  url.match(/signin/) );

	console.log("process next url: " + url);
	
  	// done, analyse results and shut down phantom
	if ( !url || numPagesVisited > maxPages ) {
		printResults(dataRoot);
		phantom.exit();
	}
  	// if we need to login its a bit more complicated
	else if (needsLogin) {
	
		// open the login url
		page.open(url, function(status) {
			var resp;
			if (status !== 'success') {
				console.log("borked");
			}
			else {
				// reset the onLoadFinished method, so we know what to do when we get  once we submit the login form
				page.onLoadFinished = doOnLoad;
				resp = page.evaluate(login);
			}
		});
	}
	else { 
    	page.open(url, doOnLoad);
  	}
};

process(); // finally kick off the whole production
