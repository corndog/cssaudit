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
 * to allow cross-domain xhr --web-security=false
 *
 * Basic usage: phantomjs --web-security=false cssaudit.js urls.txt 
 */
var fs = require('fs');
phantom.injectJs('stats.js');
phantom.injectJs('auditor.js');
phantom.injectJs('utils.js');


var crawl = false, urls = UTILS.getUrls();
// bookkeeping
var allCounts = {}, stylesheetInfo = {}, alreadyInQueue = {}, dataRoot = "data.js"; // file to write the data to, as JSON/js
// hacky stuff to limit it to a few pages at a time
var numPagesVisited = 0, maxPages = 10, size = 0;

if (!urls || urls.length == 0) {
  console.log("No urls, nothing to do");
  phantom.exit();
}
else {
  urls.forEach(function(url) {
    alreadyInQueue[url] = true;
  });
}

var page = require('webpage').create();

page.onConsoleMessage = function(msg) {
  console.log(msg);
};

var doOnLoad = function(status) {

  var sheetLink, resp;
  console.log("page loaded");
	
  if (status !== 'success') {
    console.log("something went wrong with this page " + status);
    phantom.exit();
	}
  else {
    resp = page.evaluate(AUDITOR.audit);
    numPagesVisited++;
    STATS.reduce(allCounts, resp.pageUrl, resp.counts);
    size += resp.size;

    // collect the groups of selectors as they are in the css page, so we can display something that presents the rules in a visually similar way
    for (sheetLink in resp.stylesheetInfo) {
      if (typeof resp.stylesheetInfo[sheetLink] !== 'undefined') {
        stylesheetInfo[sheetLink] = resp.stylesheetInfo[sheetLink];
      }
    }
		
    if (crawl) {
      resp.pageLinks.forEach(function(page) {
        if (!alreadyInQueue[page] ) {
          urls.push(page);
          alreadyInQueue[page] = true;
        }
      });
    }
    process();
  }
};


var process = function() {
  
  var url = (urls.length > 0 ? urls.shift() : ""), needsLogin = url.match(/signin/);

  console.log("process next url: " + url);
	
  // done, analyse results and shut down phantom
  if ( url === "" || numPagesVisited > maxPages ) {
    STATS.printResults(dataRoot, allCounts, stylesheetInfo, size);
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
        // reset the onLoadFinished method, so we know what to do once we submit the login form
        page.onLoadFinished = doOnLoad;
        resp = page.evaluate(UTILS.login);
      }
    });
  }
  else { 
    page.open(url, doOnLoad);
  }
};

process(); // finally kick off the whole production
