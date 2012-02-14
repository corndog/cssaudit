/* This is the big fat routine we pass into the loaded page.
 * Everything needs to be self contained, no closure over variables in outer phantom process, it  can just return data.
 * What happens: On each page we first find the stylesheet links, and links to other pages.
 * For each stylesheet, we load it via xhr, then find the selectors
 * then count their usage on the page. Return this object: {stylesheet: { selector: count} }
 * and the list of ursl to other pages we found., and the url we just visited
 */

var auditor = function() { 
	//embellish NodeList a little
	NodeList.prototype.forEach = Array.prototype.forEach;

	var url = window.location.href;
	console.log("looking for css for " + url);


	/* this takes the elements, either a ,or link 
 	* makes absolute urls out of relative ones,
 	* ignores links to other sites
 	* and # or javascript void ones . stolen from helium, then embellished
	*/
  	var constructOwnUrls = function(els) {
	
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

    	});
		return urls;
	};


	var findPages = function() {
		var pageLinks = document.querySelectorAll('a');
		return constructOwnUrls(pageLinks);
	};

	var findCssLinks = function() {
	
    	var linkEls = document.querySelectorAll('link[rel=stylesheet]');
		return constructOwnUrls(linkEls);
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
				results[selector] = num;
			}
		});
		return results;
	};

  	// actual logic
  	var pages = findPages();
  	var links = findCssLinks();

  //	console.log("found " + links.length + " stylesheet links");

  	var resultsForPage = {};
  	// for each css file, load it, count use of each selector
  	links.forEach(function(link) {
		//console.log("getting sheet " + link);
		var request = new XMLHttpRequest();  
		request.open('GET', link, false);  // synchronous
		request.send(null);  

		if (request.status === 200) {  
			resultsForPage[link] = analyzeStylesheet(request.responseText);
			//	console.log("processed css files");
		}
		else {
			console.log("xhr request fucked up");
		}
	});

  	// send it back to parent process
	return {pages: pages, results: resultsForPage, currentPage: url};
};
