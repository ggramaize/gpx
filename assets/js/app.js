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
		
		// Instanciate our XHR object
		this.xhr = new XMLHttpRequest();
		
		// State change handler
		this.xhr.onreadystatechange = e => this.xhrOnReadyStateChange();
		this.xhr.ontimeout = e => this.xhrOnTimeout();
		
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
		let requestedUrl = document.getElementById('url-bar').value;
		requestedUrl = 'https://test-ecdsa.luthienstar.net/gpx/cprox.php?url=' + encodeURI( requestedUrl);
		this.queryProxy( requestedUrl);
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
		
		// TODO: if redirect, decrement the redirection counter, then query proxy for the new target, if applicable and exit.
		
		// Update the page body
		let pageBody = document.getElementsByClassName('server_resp')[0];
		pageBody.innerHTML = reply.content;
		
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

