// relevant stuff is return {pages: pages, results: resultsForPage, currentPage: url, size: bodySize};
var reportForPage = function(data) {

	
};

// for each stylesheet : { count x, pieces: n, pieceCounts: { selector1: n, selector2: m}}
// gack this is getting messy
var reduce = function(summary, results) {
	
	var styleSheet, result, selector, piece, resultsForSelector, sel, pieces, pieceCounts, totalPieceCounts;
	
	
	for (styleSheet in results) {
		result = results[styleSheet];
		
		if (! summary[styleSheet]) {
			summary[styleSheet] = {};
		}
		//console.log("stylesheet: " + sheet);
		for (selector in result) {
			pieces = selector.split(',');
		//	console.log(selector + " : " + result[selector]);
			resultsForSelector = result[selector];
			pieceCounts = resultsForSelector.pieceCounts;
			
			if (typeof (summary[styleSheet][selector]) == 'undefined') {
				summary[styleSheet][selector] = {count: 0, pieces: pieces.length, pieceCounts: {}};
				pieces.forEach(function(sel){
					summary[styleSheet][selector].pieceCounts[sel] = 0;
				});
			}
			totalsForSelector = summary[styleSheet][selector];
			totalsForSelector.count += resultsForSelector.count;

			totalPieceCounts = totalsForSelector.pieceCounts; // mpa
			
			
			if (pieceCounts) {
				for (sel in pieceCounts) {
					totalPieceCounts[sel] += pieceCounts[sel];
					console.log(sel + " + " + totalPieceCounts[sel]);
				}
			}
			
		}
	}
};



var printResults = function(filePrefix) {
	
	var i, sheet, selector, result, num, used = 0, unused = 0, histogram = [], longestUnusedSelector = "", mostUsedSelector, resultsForSelector, sel;
	var fname = (filePrefix + "_unused_css.txt"), outFile = fs.open(fname , 'w');

	console.log( "open file?? " + fname + "\nsummary??");
	console.dir(summary);

	for (sheet in summary) {
		
		console.log("sheet: " + sheet);
		console.log( "outfile: " + outFile);
		
		
		outFile.writeLine("STYLESHEET: " + sheet);	
		result = summary[sheet];
	    
		for (selector in result) {
			resultsForSelector = result[selector];

			console.log("\n\nSelector: " + selector + "\nTotal: " + resultsForSelector.count);
			
			num = resultsForSelector.count;
			if (num === 0) {
				outFile.writeLine(selector + " : " + result[selector]);
				unused += 1;
				if ( selector.length > longestUnusedSelector.length) {
					longestUnusedSelector = selector;
				}
			}
			// lets just take a look at lightly used selectors
			// figure this out: ONLY HAVE A pieceCounts of multipart selector
			else if (num < 10 && selector.split(",").length > 1) {
				used += 1;
				console.log('\nlightly used:');
				for (sel in resultsForSelector.pieceCounts) {
					console.log(sel + " : " + resultsForSelector.pieceCounts[sel]);
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