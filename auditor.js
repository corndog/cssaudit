/* 
 *
 * This is the function we pass into the loaded page.
 * Everything needs to be self contained, no closure over variables in outer phantom process. It can only return data.
 * On each page we first find the stylesheet links, and links to other pages.
 * 
 * We really only care about the individual selector rules like div li.booyah 
 * If I have div.x in more than one place on a stylesheet it still has the same number of matches on page regardless of where it is.
 * So what we need to do is break down all the big aggregated selectors, and keep the unique selectors, then just count matches for each of them. Per page.
 * Afterwards if we have a group of selectors:  div.booyah, li.oh-hai {} we can just look them up.
 * For each page just pass back map of selector : count
 * When aggregating have map of selector : { page1: count, page2 : count ....., total: count }
 *
 * Using this this big fat css parser because the simple regex from before choked on key frames.
 * and it does a couple more nice things for me just collecting selectors in lists
 */

var AUDITOR = {};

AUDITOR.audit = function() {
// GOTO LINE 500 or so for where the action is

// ************************** CSS PARSER *************************************************************************

/* from https://github.com/visionmedia/css-parse
*
* { "type":"stylesheet",
*   "stylesheet": {
*     "rules":[
*       { "type":"rule",
*         "selectors":["div.oh-hai","span.oh-noes"],
*         "declarations":[{"type":"declaration","property":"max-width","value":"600px"}]
*       },
*       { "type":"rule",
*         "selectors":["h1.boom"],
*         "declarations":[{"type":"declaration","property":"color","value":"green"}]}]}}
*/

var CSSParser = {};

CSSParser.parse = function(css, options){
  options = options || {};

  /**
* Positional.
*/

  var lineno = 1;
  var column = 1;

  /**
* Update lineno and column based on `str`.
*/

  function updatePosition(str) {
    var lines = str.match(/\n/g);
    if (lines) lineno += lines.length;
    var i = str.lastIndexOf('\n');
    column = ~i ? str.length - i : column + str.length;
  }

  /**
* Mark position and patch `node.position`.
*/

  function position() {
    var start = { line: lineno, column: column };
    if (!options.position) return positionNoop;

    return function(node){
      node.position = {
        start: start,
        end: { line: lineno, column: column }
      };

      whitespace();
      return node;
    }
  }

  /**
* Return `node`.
*/

  function positionNoop(node) {
    whitespace();
    return node;
  }

  /**
* Parse stylesheet.
*/

  function stylesheet() {
    return {
      type: 'stylesheet',
      stylesheet: {
        rules: rules()
      }
    };
  }

  /**
* Opening brace.
*/

  function open() {
    return match(/^{\s*/);
  }

  /**
* Closing brace.
*/

  function close() {
    return match(/^}/);
  }

  /**
* Parse ruleset.
*/

  function rules() {
    var node;
    var rules = [];
    whitespace();
    comments(rules);
    while (css[0] != '}' && (node = atrule() || rule())) {
      rules.push(node);
      comments(rules);
    }
    return rules;
  }

  /**
* Match `re` and return captures.
*/

  function match(re) {
    var m = re.exec(css);
    if (!m) return;
    var str = m[0];
    updatePosition(str);
    css = css.slice(str.length);
    return m;
  }

  /**
* Parse whitespace.
*/

  function whitespace() {
    match(/^\s*/);
  }

  /**
* Parse comments;
*/

  function comments(rules) {
    var c;
    rules = rules || [];
    while (c = comment()) rules.push(c);
    return rules;
  }

  /**
* Parse comment.
*/

  function comment() {
    var pos = position();
    if ('/' != css[0] || '*' != css[1]) return;

    var i = 2;
    while (null != css[i] && ('*' != css[i] || '/' != css[i + 1])) ++i;
    i += 2;

    var str = css.slice(2, i - 2);
    column += 2;
    updatePosition(str);
    css = css.slice(i);
    column += 2;

    return pos({
      type: 'comment',
      comment: str
    });
  }

  /**
* Parse selector.
*/

  function selector() {
    var m = match(/^([^{]+)/);
    if (!m) return;
    return m[0].trim().split(/\s*,\s*/);
  }

  /**
* Parse declaration.
*/

  function declaration() {
    var pos = position();

    // prop
    var prop = match(/^(\*?[-\w]+)\s*/);
    if (!prop) return;
    prop = prop[0];

    // :
    if (!match(/^:\s*/)) return;

    // val
    var val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);
    if (!val) return;

    var ret = pos({
      type: 'declaration',
      property: prop,
      value: val[0].trim()
    });

    // ;
    match(/^[;\s]*/);
    return ret;
  }

  /**
* Parse declarations.
*/

  function declarations() {
    var decls = [];

    if (!open()) return;
    comments(decls);

    // declarations
    var decl;
    while (decl = declaration()) {
      decls.push(decl);
      comments(decls);
    }

    if (!close()) return;
    return decls;
  }

  /**
* Parse keyframe.
*/

  function keyframe() {
    var m;
    var vals = [];
    var pos = position();

    while (m = match(/^(from|to|\d+%|\.\d+%|\d+\.\d+%)\s*/)) {
      vals.push(m[1]);
      match(/^,\s*/);
    }

    if (!vals.length) return;

    return pos({
      type: 'keyframe',
      values: vals,
      declarations: declarations()
    });
  }

  /**
* Parse keyframes.
*/

  function atkeyframes() {
    var pos = position();
    var m = match(/^@([-\w]+)?keyframes */);

    if (!m) return;
    var vendor = m[1];

    // identifier
    var m = match(/^([-\w]+)\s*/);
    if (!m) return;
    var name = m[1];

    if (!open()) return;
    comments();

    var frame;
    var frames = [];
    while (frame = keyframe()) {
      frames.push(frame);
      comments();
    }

    if (!close()) return;

    return pos({
      type: 'keyframes',
      name: name,
      vendor: vendor,
      keyframes: frames
    });
  }

  /**
* Parse supports.
*/

  function atsupports() {
    var pos = position();
    var m = match(/^@supports *([^{]+)/);

    if (!m) return;
    var supports = m[1].trim();

    if (!open()) return;
    comments();

    var style = rules();

    if (!close()) return;

    return pos({
      type: 'supports',
      supports: supports,
      rules: style
    });
  }

  /**
* Parse media.
*/

  function atmedia() {
    var pos = position();
    var m = match(/^@media *([^{]+)/);

    if (!m) return;
    var media = m[1].trim();

    if (!open()) return;
    comments();

    var style = rules();

    if (!close()) return;

    return pos({
      type: 'media',
      media: media,
      rules: style
    });
  }

  /**
* Parse paged media.
*/

  function atpage() {
    var pos = position();
    var m = match(/^@page */);
    if (!m) return;

    var sel = selector() || [];
    var decls = [];

    if (!open()) return;
    comments();

    // declarations
    var decl;
    while (decl = declaration()) {
      decls.push(decl);
      comments();
    }

    if (!close()) return;

    return pos({
      type: 'page',
      selectors: sel,
      declarations: decls
    });
  }

  /**
* Parse document.
*/

  function atdocument() {
    var pos = position();
    var m = match(/^@([-\w]+)?document *([^{]+)/);
    if (!m) return;

    var vendor = (m[1] || '').trim();
    var doc = m[2].trim();

    if (!open()) return;
    comments();

    var style = rules();

    if (!close()) return;

    return pos({
      type: 'document',
      document: doc,
      vendor: vendor,
      rules: style
    });
  }

  /**
* Parse import
*/

  function atimport() {
    return _atrule('import');
  }

  /**
* Parse charset
*/

  function atcharset() {
    return _atrule('charset');
  }

  /**
* Parse namespace
*/

  function atnamespace() {
    return _atrule('namespace')
  }

  /**
* Parse non-block at-rules
*/

  function _atrule(name) {
    var pos = position();
    var m = match(new RegExp('^@' + name + ' *([^;\\n]+);'));
    if (!m) return;
    var ret = { type: name };
    ret[name] = m[1].trim();
    return pos(ret);
  }

  /**
* Parse at rule.
*/

  function atrule() {
    return atkeyframes()
      || atmedia()
      || atsupports()
      || atimport()
      || atcharset()
      || atnamespace()
      || atdocument()
      || atpage();
  }

  /**
* Parse rule.
*/

  function rule() {
    var pos = position();
    var sel = selector();

    if (!sel) return;
    comments();

    return pos({
      type: 'rule',
      selectors: sel,
      declarations: declarations()
    });
  }

  return stylesheet();
};

// *********** INTERESTING CODE GOES HERE *************************
	
	NodeList.prototype.forEach = Array.prototype.forEach;
	var bodySize = document.getElementsByTagName('body')[0].getElementsByTagName('*').length;
	var url = window.location.href;
	var selectorCounts, pageLinks, stylesheetLinks;
  var allSelectors = {}; // just collect all the selectors on all stylesheets used on this page
  var stylesheetInfo = {}; // keep each stylesheet url and an array of its grouped selectors, so we can display something visually reminiscent of the actual sheet.
	console.log("\nprocessing css for " + url + "\n");

	/* this takes the elements, either a , or link 
 	* makes absolute urls out of relative ones,
 	* ignores links to other sites
 	* and # or javascript void ones . stolen from helium, then embellished
	*/
	var constructOwnUrls = function(els, iscss) {
	
		var urls = [];
	
		els.forEach( function(link) {

	    var directory, lastDir, tmplink = link.getAttribute('href');
		
			// occassionally an a has nothing under its href !?
			if ( !tmplink || tmplink.match(/^#/) || tmplink.match(/javascript/)) {
				return; // ignore
			}

			// append full URI if absent
			if( tmplink.indexOf('http') !== 0 && tmplink.substr(0,2) !== '//') {
				// make sure that relative URLs work too
				if (tmplink.indexOf('/') != 0) {
					lastDir = window.location.pathname.lastIndexOf('/');
					if (lastDir > 0) {
						directory = window.location.pathname.substring(0, lastDir+1);
					} else {
						directory = '/';
					}
					tmplink = directory + tmplink;
				}
				tmplink = window.location.protocol + '//' + window.location.hostname + ":" + window.location.port + tmplink;
				//console.log("LINK IS :  " + tmplink);
			}

			//filter out web pages not on this domain since we don't want to go there
			if(iscss || tmplink.indexOf( window.location.hostname ) !== -1 ) {
				urls.push( tmplink );
		    }
		});
		return urls;
	};

	var findPageLinks = function() {
		var pageLinks = document.querySelectorAll('a');
		return constructOwnUrls(pageLinks);
	};

	var findStylesheetLinks = function() {
		var linkEls = document.querySelectorAll('link[rel=stylesheet]');
		return constructOwnUrls(linkEls, true); 
  };

  // add them to the store of selectors used on page
  var addSelectors = function(link, sheet) {
    //remove css comments
		//var data = sheet.replace(/\/\*[\s\S]*?\*\//gim,"");
		// argh nested weirdness for keyframes defeats this regexp
		//var selectorLists = data.replace(/\n/g,'').match(/[^\}]+[\.\#\-\w]?(?=\{)/gim);
		var selectorLists = []; // will be array of arrays
		var dataForSheet = CSSParser.parse(sheet);
		dataForSheet.stylesheet.rules.forEach(function(ruleObj){
			//console.log("SELECTORS\n" + ruleObj.selectors);
			
			if (ruleObj.selectors) {
				var selectors = ruleObj.selectors;
				selectorLists.push(ruleObj.selectors);
				selectors.forEach(function(selector) {
					allSelectors[selector.trim()] = 1;
				});
			}
			else { // seems to be key frame stuff
				//console.log("WHY did this happen?\n");
				if (ruleObj.declarations) {
					//console.log("at least have declarations\n" + ruleObj.declarations);
				}
			}
		});

		stylesheetInfo[link] = selectorLists;
  };

	var getCounts = function() {
		var selector, counts = {};

		for (selector in allSelectors) {
			try {
				counts[selector] = document.querySelectorAll(selector).length;
			}
			catch(e) {
				console.log("bad selector: " + selector + "\n" + e);
			}
		}
		return counts;
	};

  pageLinks = findPageLinks();
  stylesheetLinks = findStylesheetLinks();
  console.log("FOUND: " + stylesheetLinks.length + " stylesheets");

  // for each css file, load it, collect selectors
  stylesheetLinks.forEach(function(sheetLink) {
		console.log("getting sheet " + sheetLink);
		var request = new XMLHttpRequest();  
		request.open('GET', sheetLink, false);  // synchronous
		request.send(null);  

		if (request.status === 200 && request.responseText) {  
			addSelectors(sheetLink, request.responseText);
		}
		else {
			console.log("error in xhr request");
		}
	});

	// counts = { div.booyah : 10, }
  // send it back to parent process

	return { pageLinks: pageLinks, counts: getCounts(), pageUrl: url, size: bodySize, stylesheetInfo: stylesheetInfo}; 

};
