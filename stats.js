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
	
	var i, sheetName, dataForSheet, dataForSelectorGroup, dataForSelectorGroups, dataForSelectors, selectorGroup, selector, result;
	var numMatches, used = 0, unused = 0, histogram = [], histOutput = [];
	var longestUnusedSelectorGroup = "", mostUsedSelector, resultsForSelector, sel;
	var outfile, stylesSize = 0;

	for (sheetName in summary) {
		
		dataForSheet = summary[sheetName];
		stylesSize += dataForSheet.sheetSize;
		dataForSelectorGroups = dataForSheet.dataForSelectorGroups;
	    
		for (selectorGroup in dataForSelectorGroups) {
			dataForSelectorGroup = dataForSelectorGroups[selectorGroup];

			numMatches = dataForSelectorGroup.count;
			if (numMatches === 0) {
			
				unused += 1;
				if ( selectorGroup.length > longestUnusedSelectorGroup.length) {
					longestUnusedSelectorGroup = selectorGroup;
				}
			}
			// lets just take a look at lightly used selectors
			// figure this out: ONLY HAVE A pieceCounts of multipart selector
			else if (numMatches < 10 && selectorGroup.split(",").length > 1) {
				used += 1;
				console.log('\nlightly used:');
				for (sel in dataForSelectorGroup.dataForSelectors) {
					console.log(sel + " : " + dataForSelectorGroup.dataForSelectors[sel]);
				}
			}
			else {
				used += 1;
			}
			
			if (numMatches > histogram.length) {
				mostUsedSelector = selectorGroup;
			}
			
			// construct histogram of usage of rules
			if (! histogram[numMatches]) {
				histogram[numMatches] = 0;
			}
			histogram[numMatches] += 1;
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
	
	console.log("\nLongest Unused Selector:\n" + longestUnusedSelectorGroup);
	console.log(longestUnusedSelectorGroup.length + " is pretty damn long");

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