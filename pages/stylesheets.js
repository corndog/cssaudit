// have a look at things starting from a list of the stylesheets we used
// why do I want zepto??  for event delegation. good enough. now I have 
// to stop using zepto and use d3 when I can remember, or just do what I know since thats fine
// for less data oriented stuff. eh. 

(function(){

	var data = window.allData;

	var handleSheetClick = function(e) {
		var sheet = e.srcElement.innerHTML;
		renderSelectorsForSheet(sheet);
	};

	var sheetName, sheets = [];

	for (sheetName in data) {
		sheets.push(sheetName);
	}

	var renderSheetPage = function() {

		d3.select('#sheets').selectAll('div')
			.data(sheets)
			.enter().append('div')
			.attr('class', 'sheet-link')
			.text(String);
	};

	var renderSelectorsForSheet = function(sheet) {
		var selectors = [],
			dataForSheet = data[sheet];

		var temp = $(document.createDocumentFragment()); // zeptoize it


		for (selector in dataForSheet) {
			if (selector == 'pageSize') {
				continue;
			}
			info = dataForSheet[selector];

			// this isn't lovely but will do for now
			temp.append('<div class="row"><div class="num">' + info.count + '</div><div class="selector">' + selector + '</div></div>');
		}

		$('div#sheets').empty().append(temp.get(0).cloneNode(true));

	};


	// ** what actually happens on the page
	// delegate the click on the link
	$('div#sheets').on('click', 'div.sheet-link', handleSheetClick);

	renderSheetPage();

}());