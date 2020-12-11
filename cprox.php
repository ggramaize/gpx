<?php

// Autoload classes
spl_autoload_register( function( $class_name) { include "./app/include/$class_name.php"; });

error_reporting(E_ALL);
ini_set( 'error_reporting', E_ALL);
ini_set( 'display_errors', 1);
ini_set( 'display_startup_errors', 1);

function process_request( $url)
{
	// Initiate the reply
	$reply = array();

	// Setup the proxy and process the request
	$my_proxy = new GeminiProxy();
	$result = $my_proxy->process_request( $url);

	$url_elts = parse_url( $url);
	$revprox_host = $url_elts['host'];

	if( isset( $url_elts['port']) && $url_elts['port'] != 1965 )
		$revprox_host .= ':'.$url_elts['port'];

	if ( !$result['proxy_conn_success'] ) {

		// Proxy connection failed.
		// Application timeout are also handled in this code path

		$reply['prx_status']  = 'failure';
		$reply['prx_errcode'] = $result['errno'];
		$reply['prx_errstr']  = $result['errstr'];

		// Dump OpenSSL messages
		while($err = openssl_error_string()) {
			if( !isset($reply['tls_errmsg']))
				$reply['tls_errmsg'] = array();

			$reply['tls_errmsg'][] = $err;
		}

		if( isset($result['srv_cert_attrs']) )
			$reply['tls_attrs']       = $result['srv_cert_attrs'];

		if( isset($result['srv_cert_fprint']) )
		{
			$reply['tls_fprint']      = $result['srv_cert_fprint'];
			$reply['tls_fprint_b64']  = $result['srv_cert_fprint_b64'];
		}

	} else {

		// Proxy connection suceeded.
		$reply['prx_status']      = 'success';
		$reply['tls_attrs']       = $result['srv_cert_attrs'];
		$reply['tls_fprint']      = $result['srv_cert_fprint'];
		$reply['tls_fprint_b64']  = $result['srv_cert_fprint_b64'];
		$reply['header']          = $result['header'];

		// Add the content if applicable
		if( $result['content'] != null )
		{
			// only trigger conversion for text/gemini documents
			list($status, $meta) = explode( ' ', $result['header'], 2);

			if( $status >= 20 && $status <= 29 && preg_match( '/^text\/gemini/', $meta) == 1)
			{
				$gemdoc = new Gemdoc();
				$reply['content'] = $gemdoc->to_html($result['content'], $revprox_host);
			}
			else
				$reply['content'] = $result['content'];
		}
	}

	return (object) $reply;
}

if( !empty( $_GET['url'] ) )
{
	$result = json_encode( process_request( $_GET['url']) );
}
else
	$result = json_encode( (object) array( 'prx_status' => 'noop' ));

// Output content
header('Content-Type: application/json');
echo( $result);

?>
