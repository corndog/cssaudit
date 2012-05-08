// relevant stuff is return {pages: pages, results: resultsForPage, currentPage: url, size: bodySize};
var reportForPage = function(data) {

	
};

/*  
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
 */
var reduce = function(summary, results) {
	
	var sheetName, dataForSheet, dataForSelectorGroups, dataForSelectorGroup, summaryForSelectorGroups, selectorGroup, 
		summaryForSelectorGroup, dataForSelectors, summaryForSelectors, selector;
	
	
	for (sheetName in results) {
		dataForSheet = results[sheetName];
		
		if (! summary[sheetName]) {
			summary[sheetName] = dataForSheet;
			continue; // done with this stylesheet for this turn
		}
		
		// otherwise, just add counts to existing data
		dataForSelectorGroups = dataForSheet.dataForSelectorGroups;
		summaryForSelectorGroups = summary[sheetName].dataForSelectorGroups;
		for (selectorGroup in dataForSelectorGroups) {
			dataForSelectorGroup = dataForSelectorGroups[selectorGroup];
			summaryForSelectorGroup = summaryForSelectorGroups[selectorGroup];
			summaryForSelectorGroup.count += dataForSelectorGroup.count;
			
			dataForSelectors = dataForSelectorGroup.dataForSelectors;
			summaryForSelectors = summaryForSelectorGroup.dataForSelectors;

			for (selector in dataForSelectors) {
				summaryForSelectors[selector] += dataForSelectors[selector];
			}
		}
	}
};



var printResults = function(dataFile) {
	
	var i, sheet, selector, result, num, used = 0, unused = 0, histogram = [], histOutput = [], longestUnusedSelector = "", mostUsedSelector, resultsForSelector, sel;
	var fname = (filePrefix + "_unused_css.txt"), outFile = fs.open(fname , 'w'), stylesSize = 0;

	console.log( "open file?? " + fname + "\nsummary??");
	console.dir(summary);

	for (sheet in summary) {
		
		//console.log( "outfile: " + outFile);
		
		outFile.writeLine("STYLESHEET: " + sheet);	
		result = summary[sheet];
		console.log("sheet: " + sheet + " size: " + result.pageSize);
		stylesSize += result.pageSize;
	    
		for (selector in result) {
			resultsForSelector = result[selector];

			//console.log("\n\nSelector: " + selector + "\nTotal: " + resultsForSelector.count);
			
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
			histOutput.push({index: i, value: histogram[i]});
		}
	}
	console.log("\n\nMost matched selector: " + mostUsedSelector);
	
	console.log("\n\nUnused: " + unused);
	console.log("Used  : " + used);
	
	console.log("\nLongest Unused Selector:\n" + longestUnusedSelector);
	console.log(longestUnusedSelector.length + " is pretty damn long");
	
	outFile.flush();
	outFile.close();

	// write the historgram data
	outFile = fs.open('data/data.js', 'w');
	outFile.writeLine('var data = ');
	outFile.writeLine(JSON.stringify(histOutput));
	outFile.writeLine(';');
	outFile.writeLine('var stylesSize = ' + (parseInt(stylesSize/1000)) + ';');
	outFile.writeLine('var allData = ' + JSON.stringify(summary) + ';');
	outFile.flush();
	outFile.close();

	// so far this matches up with the size in bytes reported by osx. Guess it works if your css is utf8 ?
	console.log("\ntotal amount of stylesheet load: " + (parseInt(stylesSize/1000)) + " kilobytes");

};