<?php

// Autoload classes
spl_autoload_register( function( $class_name) { include "./app/include/$class_name.php"; });

error_reporting(E_ALL);
ini_set( 'error_reporting', E_ALL);
ini_set( 'display_errors', 1);
ini_set( 'display_startup_errors', 1);

?>
<html>
<head>
<link rel="stylesheet" href="assets/css/fa.css" />
<link rel="stylesheet" href="assets/css/nunito.css" />
<link rel="stylesheet" href="assets/css/app.css" />
</head>
<body>
<p>Connecting...</p>

<?php

$my_proxy = new GeminiProxy();
$result = $my_proxy->process_request( 'gemini://gemini.lan/');

if ( !$result['proxy_conn_success'] ) {
	var_dump($socket);
	echo "Failed! Error $result[errno] ($result[errstr]).</p>\n";
	while($err = openssl_error_string()) {
		print "SSL Error: $err\n";
	}
} else {
	// Extract the server certificate informations
	$srv_cert_fprint = $result['srv_cert_fprint'];
	$srv_cert_fprint_b64 = $result['srv_cert_fprint_b64'];
	$srv_cert_props = $result['srv_cert_attrs']; 

	echo("Success!</p>");
	echo("<h3>Server Certificate properties</h3>");
	echo("<p>Subject: ".$srv_cert_props['subject']['CN']."</p>");
	echo("<p>Serial: ".$srv_cert_props['serialNumber']."</p>");

	if( $result['content'] != null )
	{
		echo("<hr/><h3>Server response</h3><p>Server reply code: <b>$result[header]</b></p><p>Content</p><pre>");
		echo($result['content']);
		echo("</pre><hr /><p>Interpreted output</p><hr /><div class=\"server_resp\">");
		$gemdoc = new Gemdoc();
		echo($gemdoc->to_html($result['content'], $srv_cert_props['subject']['CN']));
		echo("</div>");
	}
}
// */
echo("</html>");

?>
