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

	console.log("Strarting auditor on page " + window.location.href);

	var pageLinks, stylesheetLinks, newLinks, uniqueSelectors, newSheets = {};

	var postToServer = function(path, data, respHandler) {
		//console.log("POSTING TO " + path + " : " + JSON.stringify(data));
		var xhr = new XMLHttpRequest();
		var url = "http://127.0.0.1:8080/" + path;
		xhr.open('POST', url, false); // sync
		var crap = JSON.stringify({"cat": 9})// JSON.stringify(data);
		//xhr.setRequestHeader('Content-type', 'application/json');
		xhr.send(crap);

		if (xhr.status === 200 && xhr.responseText) {  
			//addSelectors(sheetLink, request.responseText);
			console.log("FINALLY " + xhr.responseText);
			//respHandler(xhr.responseText);
		}
		else {
			console.log("error in xhr request");
		}
	};
	
	NodeList.prototype.forEach = Array.prototype.forEach;
	var bodySize = document.getElementsByTagName('body')[0].getElementsByTagName('*').length;
	var url = window.location.href;
	//var selectorCounts, pageLinks, stylesheetLinks;

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
				//console.log("LINK IS :  " + tmplink);
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

	var getCounts = function(selectors) {
		var selector, counts = {};

		for (selector in selectors) {
			try {
				counts[selector] = document.querySelectorAll(selector).length;
			}
			catch(e) {
				console.log("bad selector: " + selector + "\n" + e);
			}
		}
		return counts;
	};

	var postLinks = function(links) { 
  	postToServer('links', links, function(resp) {
  		var resp = JSON.parse(resp);
  		if (resp.notProcessedYet) {
  			newLinks = resp.notProcessedYet;
  		}
  		else if (resp.uniqueSelectors) {
  			uniqueSelectors = resp.uniqueSelectors;
  		}
  	});
  };

  pageLinks = findPageLinks();
  stylesheetLinks = findStylesheetLinks();
  console.log("FOUND: " + stylesheetLinks.length + " stylesheets");

  // all xhr requests block
  // first just post the list of stylesheetLinks to server, see which ones we don't already know about
  postLinks(stylesheetLinks);

  // if we don't know about some of the stylesheets, go get them
  newLinks.forEach(function(link) {
		console.log("getting contents for " + link);
		var request = new XMLHttpRequest();  
		request.open('GET', link, false);  // synchronous
		request.send(null);  

		if (request.status === 200 && request.responseText) {  
			newSheets[link] = request.responseText;
		}
		else {
			console.log("error in xhr request");
		}
	});

  // found some new ones, let the server know, just expect an OK when its done
	if (newLinks.length > 0) {
		postToServer('sheets', { sheets: newSheets, links: stylesheetLinks }, function(resp){
			uniqueSelectors = resp.uniqueSelectors; // now we should definitely get back just the unique selectors
		});
	}

	// counts = { div.booyah : 10, }
  	// send it back to parent process
	return { pageLinks: pageLinks, counts: getCounts( uniqueSelectors )}; 
};
