/* 
* see https://github.com/ariya/phantomjs/wiki/API-Reference-WebServer
*
* NOTE this needs to be run by a separate parent phantom process.  It crashes otherwise.
* 
* This appears to be the only way for a page loaded by phantom to communicate with the outside world.
* So basically we'll have to load each page and send interesting information to this server.
*
* This guy manages the collection of stylesheets and parsing them and collecting all the individual selectors used
* Page analyzer has to first download page and find the links to selector sheets.  
* 1: Post the list to the server.
* The server looks and see if it already has those sheets.  If it is missing some it sends that list back to the 
* page analyzer, which fetches them and returns them.
* One the server has all the pages it can then figure out the list of unique selectors to send to the page analyzer.
* The page analyzer then just runs querySelectorAll on each one and returns the results.
*
* Receive a post of an array of links to stylesheets.
* Fetch the stylesheets and parse and collect a list of selectors.  Keep this info laying around
* Returns a list of selectors to the page analyzer. 
* Page analyzer returns a list of {selector: count}
*/

phantom.injectJs('css-parse.js');

var stylesheetData = {};// { url : { content : actualContent, selectors : [], parsed : {see css-parse/ and below} } }

var Server = {};

var collectUniqueSelectors = function(sheetLinks) {
	var selectors, uniqueSelectors = {};
	sheetLinks.forEach(function(url){
		selectors = stylesheetData[url].selectors;
		selectors.forEach(function(sel){
			uniqueSelectors[sel] = true;
		});
	});
	return uniqueSelectors; // object
};

/* parsed data about stylesheet
* { "type":"stylesheet",
*   "stylesheet": {
*     "rules":[
*       { "type":"rule",
*         "selectors":["div.oh-hai","span.oh-noes"],
*         "declarations":[{"type":"declaration","property":"max-width","value":"600px"}]
*       },
*       { "type":"rule",
*         "selectors":["h1.boom"],
*         "declarations":[{"type":"declaration","property":"color","value":"green"}]}]}}
*/
var parseSheet = function(url, sheet) {
	var uniqueSelectors = {}, uniques = [];
	var data = CSSParser.parse(sheet);
	var sel, selectors, rules = data.stylesheet.rules;

	rules.forEach(function(rule){
		selectors = rule.selectors;
		selectors.forEach(function(selector){
			uniqueSelectors[selector] = true;
		});
	});

	for (sel in uniqueSelectors) {
		uniques.push(sel);
	}

	stylesheetData[url] = { content : sheet, selectors : uniques, parsed : data };
};

// data = {url : contents of stylesheet}
var parseSheets = function(data) {
	var url, sheet;
	for (url in data) {
		sheet = data[url];
		parseSheet(url, sheet);
	}
};

//Server.start = function() {
console.log("STARTING SERVER ");
var svr = require('webserver').create();
var service = svr.listen('127.0.0.1:8080', function(request, response) {
	//console.log("GOT SOME REQUEST FOR " + url);
	var uniqueSelectors, respData;

	//POST to /links => a list of links to stylesheets
	//if we've seen them all before return an object of the unique selectors
	//otherwise send  back a list of the ones we haven't seen
	if (request.post && request.url.match(/links/)) {
		//console.log("POST TO LINKS +****\n" + request.post);
		var sheetLinks = JSON.parse(request.post); // an array of URLS
		var notProcessedYet = [];
		sheetLinks.forEach(function(url){
			if (typeof styleSheetData[url] === 'undefined') {
				notProcessedYet.push(url);
			}
		});
		if (notProcessedYet.length > 0) {
			respData = JSON.stringify( { 'notProcessedYet' : notProcessedYet} );
		}
		else {
			// collect unique selectors 
			uniqueSelectors = collectUniqueSelectors(sheetLinks);
			respData = JSON.stringify( { 'uniqueSelectors' : uniqueSelectors} );
		}
	}
	// post to /sheets a JSON object of { url : contents of stylesheet }
	else if (request.post && request.url.match(/sheets/) ) {
		//console.log("POST TO SHEETS : " + request.post);
		var data = JSON.parse(request.post);
		parseSheets(data.sheets);
		// argh c&p
		uniqueSelectors = collectUniqueSelectors(data.links);
		respData = JSON.stringify( { 'uniqueSelectors' : uniqueSelectors} );
	}
	else {
		respData = "<H1>oh hai </H1>";
	}

  response.statusCode = 200;
  response.write(respData);
  response.close();
});

