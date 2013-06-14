var STATS = {};

(function(){
	
	/*  
 	* For each page just pass back map of selector : count
 	* When aggregating have map of selector : { page1: count, page2 : count ....., total: count }
 	*/
	STATS.reduce = function(allCounts, pageUrl, selectorCounts) {
		var count, selector;
		for (selector in selectorCounts) {
			if (typeof allCounts[selector] === 'undefined') {
				allCounts[selector] = {total : 0};
			}
			count = selectorCounts[selector];
			allCounts[selector][pageUrl] = count;
			allCounts[selector].total += count;
		}
	};


	// var allCounts = {}, stylesheetInfo = {}
	STATS.printResults = function(dataFile, allCounts, stylesheetInfo, size) {
		
		var k, count, numRules = 0, numUnused = 0;

		for (k in allCounts) {
			count = allCounts[k].total
			//console.log(k + "\n" + count);
			numRules += 1;
			if (count == 0) {
				numUnused += 1;
			}
		}
		console.log("how many rules ???? : " + numRules);
		console.log("how many not used ? : " + numUnused);
		console.log("total size of css ? : " + size);

		// write it out to data.js
		// write the historgram data
		outFile = fs.open('data/data.js', 'w');
		outFile.writeLine('var data = ' + JSON.stringify(allCounts) + ';');
		//outFile.writeLine('var stylesSize = ' + (parseInt(stylesSize/1000)) + ';');
		outFile.writeLine('var stylesheetInfo = ' + JSON.stringify(stylesheetInfo) + ';');
		outFile.writeLine('var size = ' + size + ';')
		outFile.flush();
		outFile.close();
	};

}());