/* This is the function we pass into the loaded page.
 * Everything needs to be self contained, no closure over variables in outer phantom process. It can only return data.
 * On each page we first find the stylesheet links, and links to other pages.
 * For each stylesheet, we load it via xhr, then find the selector groups and count their usage
 * then we break the big set of selectors into individual selectors and count those matches too
 * We also return the list of urls to other pages.
 *
 * Main data object we return:
 * { sheetName: {
 *		sheetSize: x, // length == number of bytes
 *		selectorGroups : [] // ordered, so they line up with the actual sheet
 *		dataForSelectorGroups: {
 *			// key for each one
 *			selectorGroup : {
 *				count: x, // matches
 *				selectors: [] // in order
 *				dataForSelectors { 
 *					// key for each one
 *					selector: n
 *				} 
 *			}
 *		}
 *	}
 *
 */

var auditor = function() { 
	
	NodeList.prototype.forEach = Array.prototype.forEach;
	var bodySize = document.getElementsByTagName('body')[0].getElementsByTagName('*').length;
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
				return; // ignore this stuff
			}

			// append full URI if absent
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

			//filter out pages not on this domain, can do cross domain xhr now for css
			if(iscss || tmplink.indexOf( window.location.hostname ) !== -1 ){
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
		return constructOwnUrls(linkEls, true); 
  	};

	// stolen from helium-css
  	var findSelectors = function(sheet) {
    	//remove css comments
		var data = sheet.replace(/\/\*[\s\S]*?\*\//gim,"");

		//parse selectors. ##NEWLINE REMOVAL IS HACKISH, CAN BE DONE BETTER WITH A BETTER REGEX
		var selectors = data.replace(/\n/g,'').match(/[^\}]+[\.\#\-\w]?(?=\{)/gim);
	
		return selectors;
  	};
  
  	// returns list of selectorGroups and data: {}
  	var analyzeStylesheet = function(stylesheet) {
   
		var selectorGroups = findSelectors(stylesheet);
		var results = {
			sheetSize: stylesheet.length,
			selectorGroups: selectorGroups,
			dataForSelectorGroups: {}
		}; 

		selectorGroups.forEach(function(selectorGroup) {
			// count, list of selectors, data: { selector: count}
			var data = {
				dataForSelectors: {} // individual selectors and counts
			};
			var selectors, numMatches = null;
			
			if (selectorGroup.match(/@font-face/) || selectorGroup.match(/@charset/)) {
				return; // ignore font-face, its not relevant
			}
		
			try {
				numMatches = document.querySelectorAll(selectorGroup).length;
			}
			catch(e) {
				console.log("bad selector: " + selectorGroup + "\n" + e);
			}
			if (numMatches !== null) {
				data.count = numMatches;
				selectors = selectorGroup.split(',');
				data.selectors = selectors;
				
				// analyse each piece if the whole thing is not too heavily used
				if (selectors.length > 1) {
					selectors.forEach(function(selector){
						data.dataForSelectors[selector] = document.querySelectorAll(selector).length;
					});
				}
				
				results.dataForSelectorGroups[selectorGroup] = data;
			}
		});
		return results;
	};

  	// actual logic
  	var pages = findPages();
  	var links = findCssLinks();
  	console.log("FOUND: " + links.length + " stylesheets");

  	var resultsForPage = {};
  	// for each css file, load it, count use of each selector
  	links.forEach(function(sheetName) {
		console.log("getting sheet " + sheetName);
		var request = new XMLHttpRequest();  
		request.open('GET', sheetName, false);  // synchronous
		request.send(null);  

		if (request.status === 200) {  
			resultsForPage[sheetName] = analyzeStylesheet(request.responseText);
		}
		else {
			console.log("error in xhr request");
		}
	});

	console.log("finished " + url);

  	// send it back to parent process
	return {pages: pages, results: resultsForPage, currentPage: url, size: bodySize};
};
