// have a look at things starting from a list of the stylesheets we used
// why do I want zepto??  for event delegation. good enough. now I have 
// to stop using zepto and use d3 when I can remember, or just do what I know since thats fine
// for less data oriented stuff. eh. 
/*  What do we have in data.js ???? 
 * var data = { selector : { total : n, pageUrl1: x, pageUrl2: y }  }
 *
 * var stylesheetInfo = { url: list of lists of selectors }
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

	//var data = window.allData;

	var handleSheetClick = function(e) {
		var sheet = e.srcElement.textContent;
		renderSelectorsForSheet(sheet);
	};

	var sheets = [];

	for (sheetName in stylesheetInfo) {
		sheets.push(sheetName);
	}

	var renderSheetPage = function() {

		d3.select('#title').text("Found These Stylesheets");

		d3.select('#sheets').html('').selectAll('div')
			.data(sheets)
			.enter().append('div')
			.attr('class', 'sheet-link')
			.text(String);
	};

	var renderSelectorsForSheet = function(sheet) {
		console.log("showing " + sheet);
	
		history.pushState({from: 'home'}, "css useage for", "?sheet=" + sheet);

		var i,j, count, listOfSelectorLists = stylesheetInfo[sheet], selector, selectorList;

		d3.select('#title').text("Selector Usage");

		var temp = $(document.createDocumentFragment()); // zeptoize it
		temp.append('<div><a href="' + sheet + '">' + sheet + '</a></div>');

		for (i=0; i < listOfSelectorLists.length; i++) {
			selectorList = listOfSelectorLists[i];
			temp.append('<div class="row">')
		  for (j = 0; j < selectorList.length; j++) {
		  	selector = selectorList[j];
		  	if (data[selector] && typeof data[selector].total == 'number') {
		  		count = data[selector].total;
		  	 	temp.append('<span class="n_' + count + '">' + selector ); //+ ' ,</span>'  );
					if (j == selectorList.length -1 ) {
						temp.append('</span>');
					}
					else {
						temp.append(', </span>');
					}
		  	}
		  	else {
		  		console.log("NO INFO FOR SELECTOR " + selector + "\nWTFF");
		  	}
		  }
		  temp.append('</div>');
			//count = info ? info.count : "bs";
			//oddEven = i % 2 == 0 ? "even" : "odd";

			// this isn't lovely but will do for now
			//temp.append('<div class="row ' + oddEven +  '"><div class="num">' + count + '</div><div class="selector js-clickable">' + selectorGroup + '</div></div>');
		}

		$('div#sheets').empty().append(temp.get(0).cloneNode(true));

	};


	// ** what actually happens on the page
	// delegate the click on the link
	$('div#sheets').on('click', 'div.sheet-link', handleSheetClick);
	//$('div#sheets').on('click', 'div.selector.js-clickable', handleSelectorGroupClick )

	renderSheetPage();

}());