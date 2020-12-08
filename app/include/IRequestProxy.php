<?php
/** Interface IRequestProxy
 * This interface defines a generic request proxy, compatible with vendor specific attributes.
 */
interface IRequestProxy {
	public function can_handle( $url);

	public function set_request_attrs( $name, $value); 

	/** process_request() - Request content from an URL
	 * Input:
	 * @return 
	 */
	public function process_request( $url);
}


