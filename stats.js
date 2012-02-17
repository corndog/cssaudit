// relevant stuff is return {pages: pages, results: resultsForPage, currentPage: url, size: bodySize};
var reportForPage = function(data) {

	
};


var reduce = function(summary, results) {
	
	var sheet, result, selector;
	
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



var printResults = function(filePrefix) {
	
	var i, sheet, selector, result, num, used = 0, unused = 0, histogram = [], longestUnusedSelector = "", mostUsedSelector;
	var fname = (filePrefix + "_unused_css.txt"), outFile = fs.open(fname , 'w');

	console.log( "open file?? " + fname);

	for (sheet in summary) {
		result = summary[sheet];
	    outFile.writeLine("STYLESHEET: " + sheet);	
		for (selector in result) {
			num = result[selector];
			if (num === 0) {
				outFile.writeLine(selector + " : " + result[selector]);
				unused += 1;
				if ( selector.length > longestUnusedSelector.length) {
					longestUnusedSelector = selector;
				}
			}
			else {
				used += 1;
			}
			
			if (num > histogram.length) {
				mostUsedSelector = selector;
			}
			
			// construct histogram of usage of rules
			if (! histogram[num]) {
				histogram[num] = 0;
			}
			histogram[num] += 1;
		}
	}
	
	console.log("\n **HISTOGRAM");
	for (i=0; i< histogram.length; i++) {
		if (typeof (histogram[i]) !== 'undefined' ) {
			console.log("match rate: " + i + ", number of selectors: " + histogram[i]);
		}
	}
	console.log("\n\nMost matched selector: " + mostUsedSelector);
	
	console.log("\n\nUnused: " + unused);
	console.log("Used  : " + used);
	
	console.log("\nLongest Unused Selector:\n" + longestUnusedSelector);
	console.log(longestUnusedSelector.length + " is pretty damn long");
	
	outFile.flush();
	outFile.close();
};