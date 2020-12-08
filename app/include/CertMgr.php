<?php

class CertMgr {

	// User's nickname. Used to select the user's store
	private $username;

	// The store's root directory
	private $datadir;

	function __construct( $username, $password, $datadir='./certs/')
	{
		// Check if directory exists

		// Check if username is valid
		if( preg_match( '/^[A-Za-z0-9]{6,32}$/', $username) != 1 )
			throw new RuntimeException( "Username doesn't satisfy the naming constraints");

		// Check if user needs to be created
		if( !file_exists( $datadir.$username) )
		{
			// TODO: Create new user
		}

		// Check if password matches
		$ref_hash = file_get_contents( $datadir.$username.'/id');
		if( !password_verify( $password, $ref_hash) ) 
			throw new RuntimeException( "Invalid password for user '$username'.");

		// Refresh password hash, if appropriate
		if( password_needs_rehash( $ref_hash, PASSWORD_DEFAULT) )
		{
			$new_hash = password_hash( $password, PASSWORD_DEFAULT);
			if( $new_hash !== false )
			{
				$fp = fopen( $datadir.$username.'/id', 'w');
				fwrite( $fp, $new_hash);
				fclose( $fp);
			}
		}

		// Update instance attributes
		$this->username = $username;
		$this->datadir = $datadir;
	}

	function gen_cert( $dn, $pkey_pass, $days=3652, $key_alg='prime256v1')
	{
		// TODO: Rate limiting

		// Generate a random ID.
		$rand_id = uniqid( '', true);

		// Derive file names from the rand_id
		$pkey_fname = $this->datadir . $this->username . '/' . $rand_id . '.pem';
		$cert_fname = $this->datadir . $this->username . '/' . $rand_id . '.crt';

		$pkey_conf = array(
			'digest_alg' => 'sha256',
			'encrypt_key' => true,
			'encrypt_key_cipher' => OPENSSL_CIPHER_AES_256_CBC,
		);

		// Add the key generation parameters
		if( $key_alg == 'rsa' )
		{
			$pkey_conf['private_key_type'] = OPENSSL_KEYTYPE_RSA;
			$pkey_conf['private_key_bits'] = 3072;
		}
		else
		{
			// Check if it's a supported curve name
			if( !in_array( $key_alg, openssl_get_curve_names()) )
				throw new RuntimeException( "Curve name '$key_alg' not supported on this system");

			$pkey_conf['private_key_type'] = OPENSSL_KEYTYPE_EC;
			$pkey_conf['curve_name'] = $key_alg;
		}

		// Generate the private key
		$pkey = openssl_pkey_new( $pkey_conf);

		// Generate the certificate request
		$csr = openssl_csr_new( $dn, $pkey, array( 'digest_alg' => 'sha256') );

		// Sign the cert request
		$cert = openssl_csr_sign( $csr, null, $pkey, $days, array( 'digest_alg' => 'sha256') );

		// Export the certificate and the private key
		openssl_x509_export_to_file( $cert, $cert_fname);
		openssl_pkey_export_to_file( $pkey, $pkey_fname, $pkey_pass, $pkey_conf);

		return $rand_id;
	}
}
