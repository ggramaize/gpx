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
		// Parse the proxy reply
		let reply = JSON.parse( r);
		let replyHeader = reply.header.split( ' ', 2);
		
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
		
		// Redirection
		if( replyHeader[0] >= 30 && replyHeader[0] <= 39)
		{
			if( --this.redirect_count < 0 )
			{
				// TODO: display an error screen if we have a redirection loop

				// Restore the last valid URL we had
				document.getElementById('url-bar').value = this.last_valid_url;
				alert('redir loop!');
				return;
			}

			if( replyHeader[0] == 31 )
			{
				// TODO: Permanent redirection operations
			}

			// TODO: handle cross-protocol warning

			this.loadPage( replyHeader[1]);
			return;
		}

		// Update the page body
		let pageBody = document.getElementsByClassName('server_resp')[0];
		pageBody.innerHTML = reply.content;
	
		// Intercept link click events
		let links = pageBody.getElementsByTagName('a');
		for( let i=0; i<links.length; ++i)
			links.item(i).addEventListener( 'click', e => this.browseFromLink(e));
		
		// Store this value as our last anchor point, in case a redirection loop happens
		this.last_valid_url = document.getElementById('url-bar').value;

		this.updateBrowsingStatus( false);
	}
	
	refresh()
	{
		// TODO
		alert('Not implemented.');
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

}

var app;

document.addEventListener( 'DOMContentLoaded', function() {
	app = new GpxBrowser();
});

