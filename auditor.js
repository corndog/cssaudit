/* This is the big fat routine we pass into the loaded page.
 * Everything needs to be self contained, no closure over variables in outer phantom process, it  can just return data.
 * What happens: On each page we first find the stylesheet links, and links to other pages.
 * For each stylesheet, we load it via xhr, then find the selectors
 * then count their usage on the page. Return this object: {stylesheet: { selector: count} }
 * and the list of urls to other pages we found., and the url we just visited
 *
 * If we are going to break a selector down, need more complex structure : selector : { count: x, pieces: n, pieceCounts: { selector1: n, selector2: m}}
 *
 */

var auditor = function() { 
	//embellish NodeList a little
	NodeList.prototype.forEach = Array.prototype.forEach;
	
	var bodySize = document.getElementsByTagName('body')[0].getElementsByTagName('*').length;
	console.log("Body Els: " + bodySize);

	var url = window.location.href;
	console.log("\nprocessing css for " + url + "\n");


	/* this takes the elements, either a ,or link 
 	* makes absolute urls out of relative ones,
 	* ignores links to other sites
 	* and # or javascript void ones . stolen from helium, then embellished
	*/
	var constructOwnUrls = function(els, iscss) {
	
		var urls = [];
	
		els.forEach( function(link) {

	    	var directory, lastDir, tmplink = link.getAttribute('href');
		
			// occassionally an a has nothing under its href !?
			if ( !tmplink || tmplink.match(/^#/) || tmplink.match(/javascript/)) {
				//console.log("IGNORE " + tmplink);
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
				urls.push( tmplink );
		    }
			else if (iscss) {
				console.log("OOPS!! Can't get " + tmplink);
			}

		});
		return urls;
	};


	var findPages = function() {
		var pageLinks = document.querySelectorAll('a');
		return constructOwnUrls(pageLinks);
	};

	var findCssLinks = function() {
	
		var linkEls = document.querySelectorAll('link[rel=stylesheet]');
		console.log("FOUND : " + linkEls.length + " link tags to go find");
		return constructOwnUrls(linkEls, true); // do some different debug/message if its css
  	};

	// stolen from helium-css
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
			var res = {};
			var pieces, pieceCounts = {};
			var num = null;
			if (selector.match(/@font-face/) || selector.match(/@charset/)) {
				return; // ignore font-face, its not relevant
			}
		
			try {
				num = document.querySelectorAll(selector).length;
			}
			catch(e) {
				console.log("bad selector: " + selector + "\n" + e);
			}
			if (num !== null) {
				res.count = num;
				pieces = selector.split(',');
				//res.numpieces = pieces.length can figure it out
				
				// analyse each piece if the whole thing is not too heavily used
				if (pieces.length > 1 && num < 25) {
					
					//console.log("splitting " + selector);
					pieces.forEach(function(sel){
						pieceCounts[sel] = document.querySelectorAll(sel).length;
						//console.log(sel + " : " + pieceCounts[sel]);
					});
					
					res.pieceCounts = pieceCounts;
				}
				
				results[selector] = res;
			}
		});
		return results;
	};

  	// actual logic
  	var pages = findPages();
  	var links = findCssLinks();

  	var resultsForPage = {};
  	// for each css file, load it, count use of each selector
  	links.forEach(function(link) {
		console.log("getting sheet " + link);
		var request = new XMLHttpRequest();  
		request.open('GET', link, false);  // synchronous
		request.send(null);  

		if (request.status === 200) {  
			resultsForPage[link] = analyzeStylesheet(request.responseText);
			//	console.log("processed css files");
		}
		else {
			console.log("error in xhr request");
		}
	});

	console.log("finished " + url);

  	// send it back to parent process
	return {pages: pages, results: resultsForPage, currentPage: url, size: bodySize};
};
