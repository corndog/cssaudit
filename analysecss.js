var  urls = ['http://127.0.0.1:8888/thing1s', 'http://127.0.0.1:8888/thing2s'],
  responsesPerPage = [];
  selectors = {}; // { fileName: { selector: true/false} }
  
// process urls from somewhere
// command line list?


// I think everything needs to be self contained
// for passing in to the page object
var doStuff = function() {

  // need a bunch of helper functions here
  // since we lose all the outer stuff once its passed into page.evaluate
  var analyzeStyles = function(stylesheet) {
    //var stylesheet = "test";
	var selectors = ['div.one', 'div.two'];
	var results = {};
	results[stylesheet] = {};

	selectors.forEach(function(selector) {
 		//var els = document.querySelectorAll(selector);
		var result = document.querySelector(selector) ? "yes" : "no";
		results[stylesheet][selector] = result;
	});
	  
	return results;
  };

  // find and parse stylesheets so we have our stylesheet and selectors
  // this bit is gonna  be async I reckon!?

  return analyzeStyles('test');
};

// do them sequentially, otherwise we could kick off a load of them and crush my laptop
var process = function process() {
  
  var page, url;

  // done, analyse results and shut down phantom
  if (urls.length === 0) {
		console.log("results!!");
	    responsesPerPage.forEach(function(results) {
		    var k, v, kk;
			for (k in results) {
			  	v = results[k];
				console.log("stylesheet: " + k);
				for (kk in v) {
					console.log(kk + " : " + v[kk]);
				}
			}
	    });
	
    	phantom.exit();
  }
  else { 
  
    page = new WebPage();
    url = urls.shift();
    console.log("lets do " + url)


    // async
    page.open(url, function(status){
	
      console.log("started " + url);
      if (status !== 'success') {
        console.log("borked");
      }
      else {
	    // sync bit is here only I think, so the recursion has to be here
        var results = page.evaluate(doStuff); // hmmm, should be a map of all selectors??/ stylesheets -> selectors for understandability
	    responsesPerPage.push(results);	
	    process(); 
      }
    });
   
  }
}();
