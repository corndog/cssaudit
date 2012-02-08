// I'm going to make this a crawler!  Crawl your website and see how much css gets used.

// read command line
var fs = require('fs');

var urls, urlsFile;

var  responsesPerPage = []
	, alreadyInQueue = {}
	, results = {}; // { fileName: { selector: true/false} }


if (phantom.args.length < 1) {
	console.log("usage: phantomjs filename.txt (file with urls) or phantomjs http://x http://y ... etc");
}
else if ( phantom.args[0].indexOf("http") < 0) {
	// read the file
	console.log("open file " + phantom.args[0]);
	urlsFile = fs.read(phantom.args[0]);
	urls = urlsFile.split("\n");
	
	urls.forEach(function(url){console.log("URL: " + url)});
}
else {
	// url to start from
	console.log(phantom.args[0]);
	urls = [phantom.args[0]];
	alreadyInQueue[phantom.args[0]] = true;
}





// I think everything needs to be self contained
// for passing in to the page object.
// On each page we first find the stylesheet links,
// then for each one, we load the sheet for 
// ourselves, and find the selectors
// then we see how they are used. booyah.
var doStuff = function() { 
  // w3c are too conservative!
  // so we can use forEach and on nodeLists
  NodeList.prototype.forEach = Array.prototype.forEach;

  console.log("processing " + window.location.href);

  // this takes the elements, either a ,or link 
  // makes absolute urls out of relative ones,
  // and does some ignoring of links to other sites
  // and # or javascript void ones 
  var constructOwnUrls = function(els) {
	
	var urls = [];
	
	els.forEach( function(link) {

	    var directory, lastDir;
		var tmplink = link.getAttribute('href');
		
		if ( !tmplink || tmplink.match(/^#/) || tmplink.match(/javascript/)) {
			console.log("IGNORE " + tmplink);
			return; // ignore this stuff
		}

		//append full URI if absent
		if( tmplink.indexOf('http') !== 0 && tmplink.substr(0,2) !== '//') {
            // make sure that relative URLs work too
            if (tmplink.indexOf('/') != 0) {
                lastDir = window.location.pathname.lastIndexOf('/');
                if (lastDir > 0) {
                    directory = window.location.pathname.substring(0, lastDir+1);
                } else {
                    directory = '/';
                }
                 tmplink = directory + tmplink;
            }
		    tmplink = window.location.protocol + '//' + window.location.hostname + ":" + window.location.port + tmplink;
		}

		//filter out urls not on this domain
		if( tmplink.indexOf( window.location.hostname ) !== -1 ){
			//console.log("push link : " + tmplink);
			urls.push( tmplink );
		}

    });
	return urls;
  };


  var findPages = function() {
	console.log("find pages");
	var pageLinks = document.querySelectorAll('a');
	return constructOwnUrls(pageLinks);
  };

  var findCssLinks = function() {
	console.log("find css links")
    var linkEls = document.querySelectorAll('link[rel=stylesheet]');
	return constructOwnUrls(linkEls);
  };

  var findSelectors = function(sheet) {
    //remove css comments
	var data = sheet.replace(/\/\*[\s\S]*?\*\//gim,"");

	//parse selectors. ##NEWLINE REMOVAL IS HACKISH, CAN BE DONE BETTER WITH A BETTER REGEX
	var selectors = data.replace(/\n/g,'').match(/[^\}]+[\.\#\-\w]?(?=\{)/gim);
	
	return selectors;
  };
  
  var analyzeStylesheet = function(stylesheet) {
   
	var selectors = findSelectors(stylesheet);
	var results = {};

	selectors.forEach(function(selector) {
		//console.log(selector);
		if (selector.match(/@font-face/) || selector.match(/@charset/)) {
			return; // ignore font-face, its not relevant
		}
		
		var num = null;
		try {
			num = document.querySelectorAll(selector).length;
		}
		catch(e) {
			console.log("bad selector: " + selector + "\n" + e);
		}
		if (num != null) {
			results[selector] = num;
		}
	});
	return results;
  };

  var pages = findPages();

  // actual logic
  var links = findCssLinks();
  console.log("found " + links.length + " stylesheet links");
 
  var resultsForPage = {};
  // for each css file, analyze its usage
  links.forEach(function(link) {
	console.log("getting sheet " + link);
	var request = new XMLHttpRequest();  
	request.open('GET', link, false);  // synchronous
	request.send(null);  
 
	if (request.status === 200) {  
		resultsForPage[link] = analyzeStylesheet(request.responseText);
		console.log("processed css files");
	}
	else {
		console.log("xhr request fucked up");
	}
  });

  return {pages: pages, results: resultsForPage};
};

var summary = {};

var reduce = function(results) {
	
	var sheet, result, selector;
	
	//var sheet, result, selector;
	for (sheet in results) {
		result = results[sheet];
		
		if (! summary[sheet]) {
			summary[sheet] = {};
		}
		//console.log("stylesheet: " + sheet);
		for (selector in result) {
		//	console.log(selector + " : " + result[selector]);
			if (typeof (summary[sheet][selector]) == 'undefined') {
				summary[sheet][selector] = 0;
			}
			summary[sheet][selector] += result[selector];
		}
	}
};

var printResults = function() {
	
	var num, used = 0, unused = 0, outFile = fs.open("results.txt", 'w'), histogram = {};

	for (sheet in summary) {
		result = summary[sheet];
	    outFile.writeLine("STYLESHEET: " + sheet);	
		for (selector in result) {
			num = result[selector];
			if (num === 0) {
				outFile.writeLine(selector + " : " + result[selector]);
				unused += 1;
			}
			else {
				used += 1;
			}
			
			// construct histogram of usage of rules
			if (! histogram[num]) {
				histogram[num] = 0;
			}
			histogram[num] += 1;
		}
	}
	
	console.log("\n **HISTOGRAM");
	for (var key in histogram) {
		console.log("use rate: " + key + ", number of selectors: " + histogram[key]);
	}
	
	console.log("Unused: " + unused);
	console.log("Used  : " + used);
	
	outFile.flush();
	outFile.close();
};



// *** now something actually happens

var page = require('webpage').create();
page.onConsoleMessage = function(msg) {
    console.log(msg);
};

var visitedLinksFile = fs.open("visitedLinks.txt", 'w');
var visited = 0;
var addMore = true

// do them sequentially, otherwise we could kick off a load of them and crush my laptop
var process = function process() {
  
  var url, resp, pages, results, summary;

  // done, analyse results and shut down phantom
  if (urls.length === 0) {
		console.log("done, summarizing and printing results to file");
	    summary = reduce(responsesPerPage);
		printResults(summary);
		
		visitedLinksFile.flush();
		visitedLinksFile.close();
    	phantom.exit();
  }
  else { 
	
    url = urls.shift();
    console.log("lets do " + url);
	visitedLinksFile.writeLine(url);

    // async
	try {
    	page.open(url, function(status){
	
      		console.log("started " + url);
      		if (status !== 'success') {
        		console.log("borked");
      		}
      		else {
	    		// sync bit is here only I think, so the recursion has to be here
        		resp = page.evaluate(doStuff); // hmmm, should be a map of all selectors??/ stylesheets -> selectors for understandability
				// better to do the reduce part here!
	    		reduce(resp.results);
	    		pages = resp.pages;

				pages.forEach(function(page) {
					if (urls.length > 20) {
						addMore = false;
					}
			
					if (addMore && !alreadyInQueue[page] ) {
						console.log("ENQUEUE: " + page);
				
						urls.push(page);
						alreadyInQueue[page] = true;
					}
				});
				console.log("next call of process!" + visited);
				visited++;
	    		process(); 
      		}
    	});
	}
	catch(e) {
		console.log(url + " fucked up on loading"); // ???
	}
   
  }
};

process();
