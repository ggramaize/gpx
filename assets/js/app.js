/*jshint esversion: 6 */


class GpxBrowser {
	//'use strict';
	
	constructor()
	{
		// TODO: Fetch history from local storage
		// browse_history is an array of Array( URL, isSensitive) objects
		this.browse_history = new Array();
		
		// TODO: Fetch known hosts from local storage
		this.known_hosts = new Object();
		
		// Reset the redirect countdown
		this.redirect_count = 5;
		
		// Browsing flag status
		this.is_browsing = false;

		this.last_valid_url = '';

		// Load the dictionary in this.dict
		this.__loadAppDict( 'en');

		// Instanciate our XHR object
		this.xhr = new XMLHttpRequest();
		
		// State change handler
		this.xhr.onreadystatechange = e => this.xhrOnReadyStateChange();
		this.xhr.ontimeout = e => this.xhrOnTimeout();
		
		// Set the previous from local storage if a value is found
		this.last_valid_url = 'gemini://gemini.lan/';

		// Bind button events to methods
		//document.getElementById('ui-prev').addEventListener( 'click', this.);
		//document.getElementById('ui-next').addEventListener( 'click', this.);
		document.getElementById('ui-stop').addEventListener( 'click', e => this.abortBrowsing(e) );
		document.getElementById('ui-refresh').addEventListener( 'click', e => this.refresh(e) );
		//document.getElementById('ui-home').addEventListener( 'click', this.);
		//document.getElementById('ui-credmgr').addEventListener( 'click', this.);
		
		// Bind keypress event to url bar
		document.getElementById('url-bar').addEventListener( 'keypress', e => this.urlbarOnKeyPress(e) );

		// Intercept click events
		this.uiHookLinks( 'server_resp');
	}

	abortBrowsing(e)
	{
		if( this.is_browsing == true )
			this.xhr.abort();
		
		// Set the navigation status
		this.updateBrowsingStatus( false);
	}
	
	browse()
	{
		// Generate the proxy URL from the document URL
		let requestedUrl = document.getElementById('url-bar').value;
		
		requestedUrl = GpxBrowser.cleanUrl( requestedUrl);
		document.getElementById('url-bar').value = requestedUrl;

		requestedUrl = document.URL.replace( /^((?:[^\/]*\/)+).+$/, '$1') + 'cprox.php?url=' + encodeURI( requestedUrl);
		this.queryProxy( requestedUrl);
	}

	browseFromLink(e)
	{
		// Reset the redirection TTL
		this.redirect_count = 5;

		// Intercept the page behaviour
		e.preventDefault();

		this.loadPage( e.target.attributes.href.value); 
	}

	loadPage( linkValue)
	{
		let currentPageUrl = document.getElementById('url-bar').value;

		// Absolute gemini link
		if( linkValue.match( /^gemini:\/\/.*/) != null )
		{
			document.getElementById('url-bar').value = linkValue;
			this.browse();
			return;
		}

		// Absolute gopher link
		if( linkValue.match( /^gopher:\/\/.*/) != null )
		{
			// NOOP for the moment, browse once proxy works
		}

		// HTTP/HTTPS link
		if( linkValue.match( /^https?:\/\/.*/) != null )
		{
			// TODO: Open in new tab
			return;
		}

		// Foreign protocol
		

		// Same page
		if( linkValue.match( /^#.*/) != null )
			return;

		// Canonical URL without the protocol
		if( linkValue.match( /^\/\/.*/) != null )
		{
			document.getElementById('url-bar').value = 'gemini:' + linkValue;
			this.browse();
			return;
		}

		// Absolute URL
		if( linkValue.match( /^\/.*/) != null )
		{
			let currentHost = document.getElementById('url-bar').value.replace( /^(gemini:\/\/[^\/\r\n]+)\/?.*$/, '$1');
			document.getElementById('url-bar').value = currentHost + linkValue;
			this.browse();
			return;
		}

		// Relative URL
		let currentHost = document.getElementById('url-bar').value.replace( /^((?:[^\/\n]*\/)+).*$/, '$1');
		document.getElementById('url-bar').value = currentHost + linkValue;
		this.browse();
	}

	static cleanUrl(url)
	{
		let matches = url.match( /^(gemini:\/\/[^\/\n\r]+\/)((?:[^\/\n\r]+\/)+)(.*)$/);
		if( matches == null )
			return url;

		let path = '';
		let elts = matches[2].split('/');

		for( var i=0; i<elts.length; ++i)
		{
			if( elts[i] == '' || elts[i] == '.' )
				continue;

			if( elts[i] == '..')
			{
				if( path == '')
					continue;

				// Remove the last directory
				path = path.replace( /^((?:[^\/\n\r]+\/)*)[^\/]+\/$/, '$1');
				continue;
			}

			path += elts[i] + '/';
			console.log(path);
		}

		return matches[1] + path + matches[3];
	}

	queryProxy( url)
	{
		// Set the navigation status
		this.updateBrowsingStatus( true);
		
		// Run the request
		this.xhr.open( 'GET', url, true);
		this.xhr.send();
	}
	
	// What to do when we receive a response from the server
	processProxyResponse( r)
	{
		// Set up a few aliases for convenience
		let urlBar = document.getElementById('url-bar');
		let pageBody = document.getElementsByClassName('server_resp')[0];

		// Parse the proxy reply
		let reply = JSON.parse( r);

		// Chech the proxy status
		if( reply.prx_status != 'success' )
		{
			switch( reply.prx_errcode)
			{
			case 62: // ETIME
				this.displayScreen( this.dict.screens.errAppTmt);
				break;

			case 104: // ECONNRESET
			case 110: // ETIMEDOUT
			case 111: // ECONNREFUSED
			case 112: // EHOSTDOWN
			case 113: // EHOSTUNREACH
				this.displayScreen( this.dict.screens.errCnnTmt, reply.prx_errstr);
				break;

			default:
				this.displayScreen( this.dict.screens.errPxy, reply.prx_errstr);
			}
			this.updateBrowsingStatus( false);
			return;
		}

		// Extract the Gemini header
		let replyHeader = reply.header.match( /^(\d+) (.+)$/);

		console.log( replyHeader);
		// TODO: check the URL's host part matches CN or one of the subjectAltName, if applicable.
		// TODO: DANE validation
		// TODO: CAA validation
		
		// Purge obsolete certificates in known_hosts
		
		// TODO: check CN:port against the known_hosts list
		/*
		if( ... )
		{
			// Host exists
		} 
		else
		{
			// Add host
		}
		// */
		// Permanent Failures
		if( replyHeader[1] >= 50 && replyHeader[1] <= 59 )
		{
			switch( replyHeader[1])
			{
			case '51':
				this.displayScreen( this.dict.screens.err51);
				break;
				
			case '52':
				this.displayScreen( this.dict.screens.err52);
				break;
				
			case '53':
				this.displayScreen( this.dict.screens.err53);
				break;
				
			case '54':
				this.displayScreen( this.dict.screens.err54);
				break;
				
			default:
				this.displayScreen( this.dict.screens.err50);
			}

			this.updateBrowsingStatus( false);
			return;
		}

		// Temporary Failures
		if( replyHeader[1] >= 40 && replyHeader[1] <= 49 )
		{
			switch( replyHeader[1])
			{
			case '41':
				this.displayScreen( this.dict.screens.err41);
				break;
				
			case '42':
				this.displayScreen( this.dict.screens.err42);
				break;
				
			case '43':
				this.displayScreen( this.dict.screens.err43);
				break;
				
			case '44':
				this.displayScreen( this.dict.screens.err44);
				break;
				
			default:
				this.displayScreen( this.dict.screens.err40);
			}

			this.updateBrowsingStatus( false);
			return;
		}

		// Input request
		if( replyHeader[1] >= 10 && replyHeader[1] <= 19)
		{
			let domain = urlBar.value.replace( /^gemini:\/\/([^\/\r\n:]+)(?::\d+)?(?:.+)?$/, '$1');
			this.promptUserForInput( domain, replyHeader[2], (replyHeader[1]==11) );
			this.updateBrowsingStatus( false);
			return;
		}

		// Redirection
		if( replyHeader[1] >= 30 && replyHeader[1] <= 39)
		{
			if( --this.redirect_count < 0 )
			{
				// Display the redirection screen
				this.displayScreen( this.dict.screens.rdir);

				let recovLink = document.getElementById('recover-tmrdir');
				recovLink.attributes.href.value = this.last_valid_url;
				recovLink.addEventListener( 'click', e => this.browseFromLink(e));

				// Restore the last valid URL we had
				//urlBar.value = this.last_valid_url;
				this.updateBrowsingStatus( false);
				return;
			}

			if( replyHeader[1] == 31 )
			{
				// TODO: Permanent redirection operations
			}

			if( 
				replyHeader[2].match( /^gemini:\/\/.*/) == null &&
				replyHeader[2].match( /^(?:(?!gemini)|[A-Za-z][A-Za-z0-9+-\.]*):\/{0,}.+$/) != null
			)
			{
				// Cross-protocol warning
				this.displayScreen( this.dict.screens.xproto);

				// Update links
				let nextLink = document.getElementById('next-xproto');
				nextLink.attributes.href.value = replyHeader[2];

				let recovLink = document.getElementById('recover-xproto');
				recovLink.attributes.href.value = this.last_valid_url;

				this.uiHookLinks( 'server_resp');
				this.updateBrowsingStatus( false);
				return;
			}

			this.loadPage( replyHeader[2]); 
			return;
		}

		// Normal content
		if( replyHeader[1] >= 20 && replyHeader[1] <= 29)
		{
			// Update the page body
			if( replyHeader[2] == 'text/plain')
				pageBody.innerHTML = '<pre>'+reply.content+'</pre>';
			else
				pageBody.innerHTML = reply.content;
		
			// Intercept link click events
			this.uiHookLinks( 'server_resp');
			
			// Store this value as our last anchor point, in case a redirection loop happens
			this.last_valid_url = document.getElementById('url-bar').value;

			this.updateBrowsingStatus( false);
			return;
		}

		// Display a generic error
		this.displayScreen( 
			this.dict.screens.errWild, 
			"Server returned the following meta: " + replyHeader[2]
		);
		this.updateBrowsingStatus( false);
	}

	displayScreen( dictLeaf, supplData=null)
	{
		let out = '<div class="browser_diag">';
		out += '<h2><span class="'+ dictLeaf.icon +'"></span> ' + dictLeaf.title + '</h2>';
		out += '<p>&nbsp;</p>';
		out += dictLeaf.details;
		
		if( supplData != null )
			out += '<p>&nbsp;</p><p id="err_details">'+supplData+'</p>';

		let docBody = document.getElementsByClassName('server_resp')[0];
		docBody.innerHTML = out;
	}

	promptUserForInput( domain, request, isSensitive)
	{
		let out = '<div class="browser_diag">';
		out += '<h2><span class="fas fa-edit"></span> ' + domain + ' expects input</h2>';
		out += '<p>&nbsp;</p><p>&nbsp;</p><div class="input-group">';
		out += '<label for="userInput" class="col-form-label">' + request + '</label></div>';
		out += '<div class="input-group"><input type="';
		out += (isSensitive == true) ? 'password': 'text';
		out += '" class="form-control" autocomplete="off" id="user-input" />';
		out += '</div><p>&nbsp;</p>';
		out += '<button type="submit" class="btn btn-outline-success">Submit</button></div>';

		var docBody = document.getElementsByClassName('server_resp')[0];
		docBody.innerHTML = out;
		docBody.getElementsByTagName('button')[0].addEventListener( 'click', e => this.sendUserInput( e, isSensitive));
	}

	refresh()
	{
		// TODO
		alert('Not implemented.');
	}

	sendUserInput( e, isSensitive)
	{
		let currentUrl = document.getElementById('url-bar').value;
		let userInput = document.getElementById('user-input').value;

		if( isSensitive == true )
		{
			alert( 'Not implemented. Sensitive? ' + isSensitive );
			return;
		}
		
		this.redirect_count = 5;
		document.getElementById('url-bar').value = currentUrl + '?' + encodeURIComponent( userInput);
		this.browse();
	}

	uiHookLinks( pbClassName)
	{
		// Reference to the page body
		let pageBody = document.getElementsByClassName( pbClassName)[0];

		// Grab the list of hyperlinks
		let links = pageBody.getElementsByTagName('a');

		for( let i=0; i<links.length; ++i)
		{
			if( links.item(i).attributes.href.value.match( /^gemini:.*/) != null )
			{
				// Hook explicitly schemed gemini links
				links.item(i).addEventListener( 'click', e => this.browseFromLink(e));
				continue;
			}

			if(  links.item(i).attributes.href.value.match( /^(?:(?!gemini)|[A-Za-z][A-Za-z0-9+-\.]*):\/{0,}.+$/) != null )
			{
				// Open foreign schemed links into a new tab/window
				let target = document.createAttribute('target');
				target.value = '_blank';
				links.item(i).attributes.setNamedItem( target);
				continue;
			}

			// Hook any remaining link the event handler
			links.item(i).addEventListener( 'click', e => this.browseFromLink(e));
		}
			
	}

	updateBrowsingStatus( flag)
	{
		// Update the browsing status flag
		this.is_browsing = flag;
		
		if( flag == true )
		{
			// Hide the refresh button and show the stop button
			document.getElementById('ui-refresh').classList.add('d-none');
			document.getElementById('ui-stop').classList.remove('d-none');
			
			// Set the navigation bar readonly
		}
		else
		{
			// Show the refresh button and hide the stop button
			document.getElementById('ui-refresh').classList.remove('d-none');
			document.getElementById('ui-stop').classList.add('d-none');
			
			// Set the navigation bar read write
		}
		
		// TODO: update history if applicable
	}
	
	updateHistory( command)
	{
		// TODO
	}
	
	urlbarOnKeyPress(e)
	{
		// Reset the redirection TTL
		this.redirect_count = 5;

		// Browse if the return key has been pressed
		if( e.keyCode == 13 )
		{
			this.browse();
			return false;
		}
		
		return true;
	}

	xhrOnReadyStateChange()
	{
		if( this.xhr.readyState == 4 )
		{
			switch( this.xhr.status)
			{
			case 200:
				this.processProxyResponse( this.xhr.responseText);
				break;
			default:
				alert('Request crapped out on the proxy side. Check logs.');
			}				
		}
	}

	xhrOnTimeout()
	{
		//alert('Proxy timed out.');
	}

	__loadAppDict( lang) {
		let ldr = new XMLHttpRequest();
		let homeDir = document.URL.replace( /^((?:[^\/]*\/)+).+$/, '$1');
		ldr.open( 'GET', homeDir+'assets/app.'+lang+'.json', false);
		ldr.send();

		if( ldr.readyState == 4 )
		{
			if( ldr.status == 200 )
				this.dict = JSON.parse( ldr.responseText);
			else
			{
				if( lang != 'en' )
					this.__loadAppDict( 'en');
			}
		}
	}
}

var app;

document.addEventListener( 'DOMContentLoaded', function() {
	app = new GpxBrowser();
});

