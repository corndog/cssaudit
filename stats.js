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


	// var allCounts = {}, styleSheetInfo = {}
	STATS.printResults = function(dataFile, allCounts) {
		console.log("RESULTS \n" + allCounts);
		
		var k, selector, selectors, selectorLists, count, countsForSelector, page, sheetLink, numRules = 0;

		for (k in allCounts) {
			console.log(k + "\n" + allCounts[k].total);
			numRules += 1;
		}
		console.log("how many rules ?? : " + numRules);

		// for (sheetLink in stylesheetInfo) {
		// 	println("sheet:\n" + sheetLink);

		// 	selectorLists = styleSheetInfo[sheetLink];

		// 	selectorLists.forEach(function(sl){
		// 		selectors = sl.split(',');
		// 		selectors.forEach(function(s){
		// 			count = allCounts[s.trim].total;
		// 			println(selectors + '\n' + count + '\n');
		// 		});
		// 	});
		// }
	};

}());