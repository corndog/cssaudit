/* 
 *
 * This is the function we pass into the loaded page.
 * Everything needs to be self contained, no closure over variables in outer phantom process. It can only return data.
 * On each page we first find the stylesheet links, and links to other pages.
 * 
 * We really only care about the individual selector rules like div li.booyah 
 * If I have div.x in more than one place on a stylesheet it still has the same number of matches on page regardless of where it is.
 * So what we need to do is break down all the big aggregated selectors, and keep the unique selectors, then just count matches for each of them. Per page.
 * Afterwards if we have a group of selectors:  div.booyah, li.oh-hai {} we can just look them up.
 * For each page just pass back map of selector : count
 * When aggregating have map of selector : { page1: count, page2 : count ....., total: count }
 *
 * TODO the structure css for css animations breaks the regex. fix this, probably by learning about parser combinators...
 */

 var AUDITOR = {};

AUDITOR.audit = function() {
	
	NodeList.prototype.forEach = Array.prototype.forEach;
	var bodySize = document.getElementsByTagName('body')[0].getElementsByTagName('*').length;
	var url = window.location.href;
	var selectorCounts, pageLinks, stylesheetLinks;
  	var allSelectors = {}; // just collect all the selectors on all stylesheets used on this page
  	var stylesheetInfo = {}; // keep each stylesheet url and an array of its grouped selectors, so we can display something visually reminiscent of the actual sheet.
	console.log("\nprocessing css for " + url + "\n");

	/* this takes the elements, either a , or link 
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
				return; // ignore
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
				console.log("LINK IS :  " + tmplink);
			}

			//filter out web pages not on this domain since we don't want to go there
			if(iscss || tmplink.indexOf( window.location.hostname ) !== -1 ) {
				urls.push( tmplink );
		    }
		});
		return urls;
	};

	var findPageLinks = function() {
		var pageLinks = document.querySelectorAll('a');
		return constructOwnUrls(pageLinks);
	};

	var findStylesheetLinks = function() {
		var linkEls = document.querySelectorAll('link[rel=stylesheet]');
		return constructOwnUrls(linkEls, true); 
  	};

  	// add them to the store of selectors used on page
  	var addSelectors = function(link, sheet) {
    	//remove css comments
		var data = sheet.replace(/\/\*[\s\S]*?\*\//gim,"");
		// argh nested weirdness for keyframes defeats this regexp
		var selectorLists = data.replace(/\n/g,'').match(/[^\}]+[\.\#\-\w]?(?=\{)/gim);

		//console.log(selectorLists);
		
		stylesheetInfo[link] = selectorLists;

		selectorLists.forEach(function(list){
			//console.log("list: " + list);
			list.split(',').forEach(function(selector) {
				//console.log('selector + ' + selector);
				allSelectors[selector.trim()] = 1;
			});
		});
  	};

	var getCounts = function() {
		var selector, counts = {};

		for (selector in allSelectors) {
			try {
				counts[selector] = document.querySelectorAll(selector).length;
			}
			catch(e) {
				console.log("bad selector: " + selector + "\n" + e);
			}
		}
		return counts;
	};

  	pageLinks = findPageLinks();
  	stylesheetLinks = findStylesheetLinks();
  	console.log("FOUND: " + stylesheetLinks.length + " stylesheets");


  	// for each css file, load it, collect selectors
  	stylesheetLinks.forEach(function(sheetLink) {
		console.log("getting sheet " + sheetLink);
		var request = new XMLHttpRequest();  
		request.open('GET', sheetLink, false);  // synchronous
		request.send(null);  

		if (request.status === 200 && request.responseText) {  
			addSelectors(sheetLink, request.responseText);
		}
		else {
			console.log("error in xhr request");
		}
	});
  	
	console.log('added selectors');

	//selectorCounts = getCounts();

	//console.log("finished " + url);

	// counts = { div.booyah : 10, }
  	// send it back to parent process
	return { pageLinks: pageLinks, counts: getCounts(), pageUrl: url, size: bodySize, styleSheetInfo: stylesheetInfo}; 
};
