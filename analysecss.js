var  urls = ['http://www.scala-lang.org', 'http://www.scala-lang.org/node/219'],
 // ['http://127.0.0.1:8888/thing1s', 'http://127.0.0.1:8888/thing2s'],
  responsesPerPage = [],
  results = {}; // { fileName: { selector: true/false} }
  
// process urls from somewhere
// command line list?


// I think everything needs to be self contained
// for passing in to the page object. Sort of.
// On each page we first find the stylesheet links,
// then for each one, we asyn load the sheet for 
// ourselves, and find the selectors
// then we see how they are used. booyah.
var doStuff = function() { 

  NodeList.prototype.forEach = Array.prototype.forEach;

  console.log("doing stuff");
  console.log(window.location.href);

  var get = function(url, callback) {
  
    var http = new XMLHttpRequest();
	
	console.log("try getting " + url);
		
	http.open("GET", url);
	http.onreadystatechange=function() {
		if(http.readyState === 4) {
			callback(http.responseText);
		}
	}
	http.send(null);
  };

  var findLinks = function() {
	console.log("find links");
    var linkEls = document.querySelectorAll('link[rel=stylesheet]');
	
	var links = [];
	
	// now have screw with relative and absolute urls!
	linkEls.forEach( function(link) {
		//console.log(link + "\n" + typeof link);
	    var directory, lastDir;
		var tmplink = link.getAttribute('href');
		//console.log("href is " + tmplink);

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
			links.push( tmplink );
		}

    });
	return links;
  };

  var findSelectors = function(sheet) {
    //remove css comments
	var data = sheet.replace(/\/\*[\s\S]*?\*\//gim,"");

	//parse selectors. ##NEWLINE REMOVAL IS HACKISH, CAN BE DONE BETTER WITH A BETTER REGEX
	var selectors = data.replace(/\n/g,'').match(/[^\}]+[\.\#\-\w]?(?=\{)/gim);
	
	return selectors;
  };
  
  // need a bunch of helper functions here
  // since we lose all the outer stuff once its passed into page.evaluate
  var analyzeStylesheet = function(stylesheet) {
    //var stylesheet = "test";
	var selectors = findSelectors(stylesheet);
	var results = {};

	selectors.forEach(function(selector) {
 		//var els = document.querySelectorAll(selector);
		var result = document.querySelectorAll(selector).length;
		results[selector] = result;
		//console.log(selector + " used: " + result);
	});

	return results;
  };

  // find and parse stylesheets so we have our stylesheet and selectors
  // this bit is gonna  be async I reckon!?
  
  // actual logic
  var links = findLinks();
  var numLinks = links.length;
  console.log("found " + numLinks + " styleshhet links");
  var numDone = 0;
  var numStarted = 0;
  var resultsForPage = {};
  // for each css file, analyze its usage
  links.forEach(function(link) {
	console.log("getting sheet " + link);
	var request = new XMLHttpRequest();  
	request.open('GET', link, false);  // just make it sync!! 
	request.send(null);  
 
	if (request.status === 200) {  
		resultsForPage[link] = analyzeStylesheet(request.responseText);
		console.log("processed css files");
	}
	else {
		console.log("xhr request fucked up");
	}
  });

  return resultsForPage;
};


// do them sequentially, otherwise we could kick off a load of them and crush my laptop
var process = function process() {
  
  var page, url;

  // done, analyse results and shut down phantom
  if (urls.length === 0) {
		console.log("results!!");
	    responsesPerPage.forEach(function(results) {
		    var sheet, result, selector;
			for (sheet in results) {
			  	result = results[sheet];
				console.log("stylesheet: " + sheet);
				for (selector in result) {
					console.log(selector + " : " + result[selector]);
				}
			}
	    });
	
    	phantom.exit();
  }
  else { 
  
    page = new WebPage();
	page.onConsoleMessage = function(msg) {
        console.log(msg);
    };
    url = urls.shift();
    console.log("lets do " + url)

    // async
    page.open(url, function(status){
	
      console.log("started " + url);
      if (status !== 'success') {
        console.log("borked");
      }
      else {
	    // sync bit is here only I think, so the recursion has to be here
        var results = page.evaluate(doStuff); // hmmm, should be a map of all selectors??/ stylesheets -> selectors for understandability
	    responsesPerPage.push(results);
		console.log("next call of process!");
	    process(); 
      }
    });
   
  }
}();
