/*
 * Load urls from command line params, either the url(s) themselves or a file
 * NOTE urls all need to start with http or phantom won't understand them
 */
 

// plan is to support a number of options
// 1) hand in one more urls on the command line
// 2) read a file with a list of urls
// 3) in either case either just those urls or allow crawling
// 4) provide a way of putting some hard limit on the number of pages hit
//    to stop things running for an excessive amount of time
var getUrls = function() {
	//console.log("getting urls");
	var fname, urls = [];
	
	if (phantom.args.length < 1) {
		console.log("usage: phantomjs filename.txt (file with urls) or phantomjs http://x http://y ... etc");
		phantom.exit();
	}
	// otherwise process command line args, urls starting with http and/or filenames, file contains urls each on a new line
	
	// it url(s)
	else if ( phantom.args[0].match(/http:/) ) {
		console.log("command line urls");
		phantom.args.forEach(function(url){
			urls.push(url);
		});
	}
	// should be a file containing urls
	else {
		fname = phantom.args[0];
		console.log('looking for file ' + fname);
		var urlsFile = fs.read(fname);
		if (urlsFile) {
			urlsFile.split("\n").forEach(function(url){
				console.log("found " + url);
				if (url.indexOf('http') === 0) urls.push(url);
			});
		}
		else {
			console.log("couldn't open file " + fname);
		}
	}
	
	return urls;
};

// obviously need to tailor this to the login page
var login = function() {

	console.log("start login");
  	//	document.addEventListener('DOMContentLoaded', function(){ console.log("made it too " + window.location.href)}, false);
	var username = "username";
	var password = "password";
	// id of email input = #user_email
	// id of password = #user_password
	// button = #user_submit,   just click it?
	document.querySelector('#user_email').value = username;
	document.querySelector('#user_password').value = password;
	document.querySelector('#user_submit').click(); 
  
	console.log("kicked off login process, now we're at " + window.location.href);
	return "no errors so far";
};

