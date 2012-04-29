"use strict"; 

/* Crawl your website and see how much css gets used.
 *
 * problems: it occassionally dies on fxbml tags not rendering, can I catch an exception somewhere?
 *
 * use notes: if you need cookies - accessing an authed page, need to remember to delete old cookie file first
 * something gets borked if you don't
 *
 * Next idea: as we process, spit out a bunch of html files: a summary page for aggregated data, 
 * and a link to a page for each real page analyzed with more detail about that page.
 * pretty bad ass huh!
 *
 * Also, at this point it just does the count (querySelectorAll) on the big fat multi rule selector
 * If the count is low and its a big selector lets take a look at which pieces were used/not
 *
 * And look at the rules inside and see if they get repeated!!!
 *
 */

// file system
var fs = require('fs');


// a few includes, just put them in a separate file for manageability
phantom.injectJs('stats.js'); // reduce, printResults
phantom.injectJs('auditor.js'); // auditor
phantom.injectJs('utils.js'); // getUrls, login


// used in url loading
var urls, startUrl, fname, fprefix, visitedLinksFile;
// bookkeeping
var summary = {}, alreadyInQueue = {};
// hacky stuff to limit it to a few pages at a time
var visited = 0, addMore = true, limitPagesTo = 2; // stop it after a few pages


// take sth like http://www.xyz.com/thing1/id1... etc
// and turn it into something thats works as file name
// then append something interesting on the end to distinguish it from other files
var makeOutputFileName = function(url) {
	return "results/" +  url.replace("http://", '').replace(/[:|\.|\/]/g, '_');
};
// processes command line to collect urls from command line and/or file, function in getUrls file
urls = getUrls();

if (!urls || urls.length == 0) {
	console.log("No urls, nothing to do");
	phantom.exit();
}

fprefix = makeOutputFileName(urls[0]);
fname = fprefix + "_visitedLinks.txt";
console.log(fname);
visitedLinksFile = fs.open(fname , 'w');



// ****  now something actually happens, create page and do stuff
var page = require('webpage').create();

page.onConsoleMessage = function(msg) {
	console.log(msg);
};


// for pages we want to audit css
var doOnLoad = function(status) {

	var resp;
	
	if (status !== 'success') {
		console.log("something went wrong with this page " + status);
		phantom.exit();
	}
	else {
	
		console.log("try processing the css");
		resp = page.evaluate(auditor);
		visited++;
	 
		// add this pages results to summary
		reduce(summary, resp.results);
		console.log("done with that page");
		alreadyInQueue[resp.currentPage] = true; // alreadyDoneOrInQ
		visitedLinksFile.writeLine(resp.currentPage);

		resp.pages.forEach(function(page) {
	  		if (urls.length > limitPagesTo) {
				addMore = false;
			}

			if (addMore && !alreadyInQueue[page] ) {
				console.log("ENQUEUE: " + page);

				urls.push(page);
				alreadyInQueue[page] = true;
			}
		});
	  	//console.log("next call of process!" + visited);
	  
	//	console.log("process??? " + typeof process);
	  	process(); // do it all again
    }
};


// do them sequentially, otherwise we could kick off a load of them and crush my laptop
var process = function process() {
	
	console.log("length: " + urls.length);
  
	var url = (urls.length > 0 ? urls.shift() : false), needsLogin = ( url &&  url.match(/signin/) );

	console.log("next url to process is " + url);
	
  	// done, analyse results and shut down phantom
	if ( !url ) {
		console.log("done, summarizing and printing results to file");
	    
		//printResults(summary);
		printResults(fprefix)
		visitedLinksFile.flush();
		visitedLinksFile.close();
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
			
				resp = page.evaluate(login); // hmmm, should be a map of all selectors??/ stylesheets -> selectors for understandability
				console.log("recieved " + resp);
			}
		});
	}

	// 
	else { 
    	page.open(url, doOnLoad);
  	}
};

process(); // finally kick off the whole production
