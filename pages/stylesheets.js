// have a look at things starting from a list of the stylesheets we used
// why do I want zepto??  for event delegation. good enough. now I have 
// to stop using zepto and use d3 when I can remember, or just do what I know since thats fine
// for less data oriented stuff. eh. 
/* Main data object we return:
 * { sheetName: {
 *		sheetSize: x, // length == number of bytes
 *		selectorGroups : [] // ordered, so they line up with the actual sheet
 *		dataForSelectorGroups: {
 *			// key for each one
 *			selectorGroup : {
 *				count: x, // matches
 *				selectors: [] // in order
 *				dataForSelectors { f
 *					// key for each one
 *					selector: n
 *				} 
 *			}
 *		}
 *	}
 */ 

(function(){


	window.onpopstate = function(event) {

		// hmm, is this how its supposed to be used???
		var search = window.location.search;
		
		if (search === "") {
			renderSheetPage();
		}
		else {
			var sheet = search.split("=")[1];
			renderSelectorsForSheet(sheet);
		}
	};

	var data = window.allData;

	var handleSheetClick = function(e) {
		var sheet = e.srcElement.textContent;
		renderSelectorsForSheet(sheet);
	};

	var handleSelectorGroupClick = function(e) {
		var selectorGroup = e.srcElement.textContent;
		console.log(selectorGroup);
		renderDataForSelectorGroup(selectorGroup);
	};

	var sheetName, sheets = [];

	for (sheetName in data) {
		sheets.push(sheetName);
	}

	var renderSheetPage = function() {

		//history.pushState({from: 'home'}, "css useage", "");

		d3.select('#title').text("Found These Stylesheets");

		d3.select('#sheets').html('').selectAll('div')
			.data(sheets)
			.enter().append('div')
			.attr('class', 'sheet-link')
			.text(String);
	};

	var renderDataForSelectorGroup = function(selectorGroup) {
		console.log("clickec selector group: " + selectorGroup);
		var sheet = window.location.search.split("=")[1];
		
		history.pushState({from: "stuff"}, "counts for ", "#frag");

		// find the data
		var i, info , selectorGroup, count, oddEven,
			dataForSheet = data[sheet],
			selectorGroups = dataForSheet.selectorGroups,
			dataForSelectorGroups = dataForSheet.dataForSelectorGroups,
			dataForSelectors = dataForSelectorGroups[selectorGroup].dataForSelectors,
			selectors = dataForSelectorGroups[selectorGroup].selectors ;

			var temp = $(document.createDocumentFragment()); //

			for (i=0; i< selectors.length; i++) {
				selector = selectors[i];
				count = dataForSelectors[selector] || 0;
				oddEven = i % 2 == 0 ? "even" : "odd";
				temp.append('<div class="row ' + oddEven +  '"><div class="num">' + count + '</div><div class="selector">' + selector + '</div></div>');
			}

			$('div#sheets').empty().append(temp.get(0).cloneNode(true));
	};

	var renderSelectorsForSheet = function(sheet) {
		console.log("showing " + sheet);
	
		history.pushState({from: 'home'}, "css useage for", "?sheet=" + sheet);

		var i, info , selectorGroup, count, oddEven,
			dataForSheet = data[sheet],
			selectorGroups = dataForSheet.selectorGroups,
			dataForSelectorGroups = dataForSheet.dataForSelectorGroups;

			d3.select('#title').text("Selector Usage");

		var temp = $(document.createDocumentFragment()); // zeptoize it
		temp.append('<div><a href="' + sheet + '">' + sheet + '</a></div>');

		for (i=0; i< selectorGroups.length; i++) {
			selectorGroup = selectorGroups[i]
			info = dataForSelectorGroups[selectorGroup];

			count = info ? info.count : "bs";
			oddEven = i % 2 == 0 ? "even" : "odd";

			// this isn't lovely but will do for now
			temp.append('<div class="row ' + oddEven +  '"><div class="num">' + count + '</div><div class="selector js-clickable">' + selectorGroup + '</div></div>');
		}

		$('div#sheets').empty().append(temp.get(0).cloneNode(true));

	};


	// ** what actually happens on the page
	// delegate the click on the link
	$('div#sheets').on('click', 'div.sheet-link', handleSheetClick);
	$('div#sheets').on('click', 'div.selector.js-clickable', handleSelectorGroupClick )

	renderSheetPage();

}());