<?php

class Gemdoc {

	const OUT_DEFAULT = 0;
	const OUT_PREFMT = 1;
	const OUT_QUOTE = 2;
	const OUT_LIST = 3;

	private $out = '';
	private $status = self::OUT_DEFAULT;

	private function close_list()
	{
		// Close lists
		if( $this->status == self::OUT_LIST )
		{
			$this->out .= "</ul>\n";
			$this->status = self::OUT_DEFAULT;
		}
	}

	private function close_quote()
	{
		if( $this->status == self::OUT_QUOTE )
		{
			$this->out .= "</div></div>\n";
			$this->status = self::OUT_DEFAULT;
		}
	}

	private function open_list()
	{
		if( $this->status != self::OUT_LIST )
		{
			$this->out .= "<ul>\n";
			$this->status = self::OUT_LIST;
		}
	}

	private function open_quote()
	{
		if( $this->status != self::OUT_QUOTE )
		{
			$this->out .= "<div class=\"quote-block\"><div>\n";
			$this->status = self::OUT_QUOTE;
		}
	}

	private function not_in_prefmt()
	{
		return( $this->status != self::OUT_PREFMT );
	}

	public static function escape_str( $str)
	{
		return str_replace( 
			array( '<', '>', '&'), 
			array( '&lt;', '&gt;', '&amp;'), 
			$str
		);
	}

	public function to_html( $document, $hostname)
	{
		// Strip CRs
		$body = str_replace( "\r", '', $document);

		// Set the output
		$this->out = '';
		$this->status = self::OUT_DEFAULT;

		// Explode the document in lines
		$lines = explode( "\n", $body);

		foreach( $lines as $l)
		{
			// Preformatted block
			if( preg_match( '/^```/', $l) == 1 )
			{
				$this->close_list();
				$this->close_quote();

				//
				$this->out .= ($this->status != self::OUT_PREFMT) ? "<pre>\n" : "</pre>\n";
				$this->status .= ($this->status != self::OUT_PREFMT) ? self::OUT_PREFMT : self::OUT_DEFAULT;
				continue;
			}

			// Links: =>([whitespace])[URL]([SP][Friendly text])
			if( $this->not_in_prefmt() && preg_match( '/^=>\s*(\S+)(?:\s+(.+))?$/', $l, $matches) == 1 )
			{
				$this->close_list();
				$this->close_quote();

				// Cross-protocol link coloring
				if( !empty($matches[1]) )
				{
					$url_attrs = parse_url($matches[1]);
					if( !empty($url_attrs['scheme']) )
					{
						if( 
							preg_match( '/^gemini$/', $url_attrs['scheme']) == 1 
							&& !empty($url_attrs['host'])
							&& $url_attrs['host'] != $hostname
						)
							$schm_class = 'link-ext';
						elseif( preg_match( '/^https?$/', $url_attrs['scheme']) == 1 )
							$schm_class = 'link-http';
						elseif( $url_attrs['scheme'] == 'gopher' )
							$schm_class = 'link-gopher';
						elseif( $url_attrs['scheme'] == 'mailto' )
							$schm_class = 'link-mail';
						elseif( $url_attrs['scheme'] != 'gemini' )
							$schm_class = 'link-other';
					}
					elseif( !empty($url_attrs['host']) && $url_attrs['host'] != $hostname )
						$schm_class = 'link-ext';

				}

				// Fill the variable for other cases
				$schm_class = $schm_class ?? '';

				$url_elts = parse_url( $matches[1]);
				if( !empty($matches[2] ) )
				{
					$this->out .= '<p class="no-lmarg">';
					$this->out .= '<a class="'.$schm_class.'" href="'.$matches[1].'" rel="nofollow">'.$matches[2].'</a></p>'."\n";
				}
				else
				{
					$this->out .= '<p class="no-lmarg">';
					$this->out .= '<a class="'.$schm_class.'" href="'.$matches[1].'" rel="nofollow">'.$matches[1].'</a></p>'."\n";
				}
				$this->status = self::OUT_DEFAULT;
				continue;
			}

			// Headings
			if( $this->not_in_prefmt() && preg_match( '/^(#+)\s*(.+)$/', $l, $matches) == 1 )
			{
				$type = strlen( $matches[1]);
				$type = min( $type, 3);

				// Escape special characters
				$content = self::escape_str( $matches[2]);

				$this->out .= "<h$type>$content</h$type>\n";

				$this->status = self::OUT_DEFAULT;
				continue;
			}

			// Quotes
			if( $this->not_in_prefmt() && preg_match( '/>\s*(.*)/', $l, $matches) == 1 )
			{
				$this->close_list();
				$this->open_quote();

				// Escape special characters
				if( !empty( $matches[1]) )
					$content = self::escape_str( $matches[1]);
				else
					$content = "&nbsp;";

				$this->out .= "<p>$content</p>\n";
				continue;
			}

			// Unordered List
			if( $this->not_in_prefmt() && preg_match( '/^\*\s*(.+)$/', $l, $matches) == 1 )
			{
				$this->close_quote();
				$this->open_list();

				if( !empty( $matches[1]) && !empty(trim($matches[1])))
					$content = self::escape_str( trim( $matches[1]));
				else
					$content = '&nbsp;';

				$this->out .= "<li>$content</li>\n";
				continue;
			}
			
			// Standard text
			if( $this->status == self::OUT_PREFMT )
			{
				$this->out .= $l."\n";
			}
			else
			{
				$this->close_list();
				$this->close_quote();

				// Escape special characters
				$content = self::escape_str( trim( $l) );

				if( empty($content) )
					$this->out .= "<p>&nbsp;</p>\n";
				else
					$this->out .= "<p>$content</p>\n";
				$this->status = self::OUT_DEFAULT;
			}

		}
		return $this->out;
	}
};

?>
