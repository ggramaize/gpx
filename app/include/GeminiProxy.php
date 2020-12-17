<?php

class GeminiProxy implements IRequestProxy
{
	// Path to the client certificate private key
	private $client_pkey = null;

	// Path to the client certificate public key
	private $client_cert = null;

	// The client certificate password
	private $client_pass = null;

	// The connection timeout (in seconds)
	private $connect_timeout = 4;

	// The delay after which we give up fetching the content
	private $content_timeout = 10;

	// Returns true if this is a Gemini URL
	public function can_handle( $url)
	{
		$scheme = parse_url( $url, PHP_URL_SCHEME);
		if( !empty($scheme) && $scheme == 'gemini' )
			return true;

		return false;
	}

	// Define our request parameters
	public function set_request_attrs( $name, $value)
	{
		switch($name)
		{
		case 'client_pkey':
			$this->client_pkey = $value;
			break;

		case 'client_cert':
			$this->client_cert = $value;
			break;

		case 'client_pass':
			$this->client_pass = $value;
			break;

		case 'timeout':
			$this->connect_timeout = $value;
			break;

		case 'content_timeout':
			$this->content_timeout = $value;

		default:
			// Silently ignore parameter
		}
	}

	public function process_request( $url)
	{
		// Initialize the result array
		$result = array();

		// Abort immediately if we can't handle that request
		if( !$this->can_handle( $url) )
		{
			// Connection failed
			$result['proxy_conn_success'] = false;
			$result['errno'] = 0;
			$result['errstr'] = 'Protocol not supported by this proxy';
			return $result;
		}

		// Parse the query to derive the connection URL
		$url_elts = parse_url($url);
		$tls_target = 'tls://' . $url_elts['host'] . ':' . ($url_elts['port'] ?? 1965) . '/';

		// Create connection options
		$conn_opts = array( 
			'ssl' => array(
				// TLS Server options
				'capath' => '/etc/ssl/certs',
				'verify_peer' => false,
				'verify_peer_name' => true,
				'allow_self_signed' => true,
				'security_level' => '2',
				'ciphers' => 'AESGCM:CHACHA20:AESCCM:!kRSA:!aNull',
				'capture_peer_cert' => TRUE,
				'verify_depth' => 10,
			)
		);

		// Check if client certificates attributes are set
		if( $this->client_cert != null && $this->client_pkey != null)
		{
			// TODO: Check if the client certificate files are readable
			// TODO: Check if the client certificate matches its public key

			// Add the client certificate files to the connection options
			$conn_opts['ssl']['local_cert'] = $this->client_cert;
			$conn_opts['ssl']['local_pk']   = $this->client_pkey;

			// Add the client certificate password to the connection options, if applicable
			if( $this->client_pass != null && $this->client_pass != '' )
				$conn_opts['ssl']['passphrase'] = $this->client_pass;

			// TODO: Attempt to decrypt the private key
		}

		// Create the Stream context from the options
		$conn_ctx = stream_context_create( $conn_opts);

		// Attempt to connect to the server
		$errno = 0;
		$errstr = null;

		// Create the connection context
		$conn_ctx = stream_context_create( $conn_opts);

		// Connect to server
		// We need to mute the function, since connection failures generate a warning, which we handle later
		$socket = @stream_socket_client(
			$tls_target, 
			$errno, 
			$errstr, 
			$this->connect_timeout, 
			STREAM_CLIENT_CONNECT, 
			$conn_ctx
		);

		if( !$socket )
		{
			// Connection failed
			$result['proxy_conn_success'] = false;
			$result['errno'] = $errno;
			$result['errstr'] = $errstr;
			return $result;
		}

		// Connection succeeded
		$result['proxy_conn_success'] = true;

		// Copy the server certificate attributes
		$tls_metadata = stream_context_get_params($socket);
		$result['srv_cert_attrs'] = openssl_x509_parse( $tls_metadata['options']['ssl']['peer_certificate']);
		$result['srv_cert_fprint'] = openssl_x509_fingerprint( $tls_metadata['options']['ssl']['peer_certificate'], 'sha256');
		$result['srv_cert_fprint_b64'] = base64_encode( pack( 'H*', $result['srv_cert_fprint']));

		// Set the application timer
		stream_set_timeout( $socket, $this->content_timeout);

		// Send request URL to socket
		fwrite( $socket, "$url\r\n");
		fflush( $socket);

		// Retrieve the result
		$response = stream_get_contents( $socket);

		// Retrieve the metadata to check if we timed out
		$conn_metadata = stream_get_meta_data( $socket);

		// Close the connection
		fclose( $socket);

		// Handle Application Timeout
		if( isset( $conn_metadata['timed_out']) && $conn_metadata['timed_out'] )
		{
			$result['proxy_conn_success'] = false;
			$result['errno'] = 62; // ETIME
			$result['errstr'] = 'Application timed out while sending response';
			return $result;
		}

		// Parse the result
		list( $result['header'], $result['content']) = explode("\n", $response, 2);

		$result['header'] = str_replace( "\r", '', $result['header']);

		return $result;
	}
}

