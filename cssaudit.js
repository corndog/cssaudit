"use strict"; 

/* Crawl your website and see how much css gets used.
 *
 * problems: it occassionally dies on fxbml tags not rendering, can I catch an exception somewhere?
 *
 * use notes: if you need cookies - accessing an authed page, need to remember to delete old cookie file first
 * something gets borked if you don't
 *
 */

// file system
var fs = require('fs');


// a few includes, just put them in a separate file for manageability
phantom.injectJs('stats.js'); // reduce, printResults
phantom.injectJs('auditor.js'); // auditor
phantom.injectJs('getUrls.js'); // getUrls


// used in url loading
var urls, startUrl, filePrefix, fname, visitedLinksFile;
// some bookkeeping
var summary = {}, alreadyInQueue = {};
// hacky stuff to limit it to a few pages at a time
var visited = 0, addMore = true, limitPagesTo = 2; // stop it after a few pages


// processes command line for to collect urls from command line and/or file
urls = getUrls();
startUrl = urls[0];
filePrefix =  startUrl.replace("http://", '').replace(/[:|\.|\/]/g, '_');
fname = filePrefix + "_visitedLinks.txt";
visitedLinksFile = fs.open(fname , 'w');


// obviously need to tailor this to the login page
var login = function() {

	console.log("start login");
  	//	document.addEventListener('DOMContentLoaded', function(){ console.log("made it too " + window.location.href)}, false);
	var username = "yourusername";
	var password = "secret";
	// id of email input = #user_email
	// id of password = #user_password
	// button = #user_submit,   just click it?
	document.querySelector('#user_email').value = username;
	document.querySelector('#user_password').value = password;
	document.querySelector('#user_submit').click(); 
  
	console.log("kicked off login process, now we're at " + window.location.href);
	return "no errors so far";
};


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
		//	page.render("homepage.png");
		resp = page.evaluate(auditor);
	 
		// add this pages results to summary
		reduce(summary, resp.results);
		alreadyInQueue[resp.currentPage] = true; // alreadyDoneOrInQ
		visitedLinksFile.writeLine(resp.currentPage);

		resp.pages.forEach(function(page) {
	  		if (urls.length > limitPagesTo) {
				addMore = false;
			}

			if (addMore && !alreadyInQueue[page] ) {
				//console.log("ENQUEUE: " + page);

				urls.push(page);
				alreadyInQueue[page] = true;
			}
		});
	  	console.log("next call of process!" + visited);
	  	visited++;
		console.log("process??? " + typeof process);
	  	process(); // do it all again
    }
};


// do them sequentially, otherwise we could kick off a load of them and crush my laptop
var process = function process() {
	
	console.log("length: " + urls.length);
  
  	var url = urls.length > 0 ? urls.shift() : false, 
		needsLogin = ( url &&  url.match(/signin/) ),
		summary;

	console.log("next url to process is " + url);
	
  	// done, analyse results and shut down phantom
	if ( !url ) {
    	console.log("done, summarizing and printing results to file");
	    
		printResults(summary);
		visitedLinksFile.flush();
		visitedLinksFile.close();
    	phantom.exit();
  	}

  	// if we need to login its a bit more complicated
  	else if (needsLogin) {
	
		// open the login url
		page.open(url, function(status) {
			//console.info("opening " + url);
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
