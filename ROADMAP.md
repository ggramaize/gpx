# Roadmap

## For first release
* User certificate management (back)
    * Multiple user management
    * Generate new keys (RSA & EC)
    * List user keys
* User interface
    * Fancy style sheet to decorate gemtext content
    * Standard navigation
    * User Certificate management
    * User input management
    * Error screens
    * Display Server certificate attributes
* Server-side Gemtext parser
* Gemini Proxy

## For later
* Backend
    * DANE record fetcher
    * CAA record fetcher
* Certificate management
    * Account password recovery
    * Certificate retrieval
    * Scheduled suppression of obsolete certificates/keys
    * Server certificate trust base
         * TOFU
         * CN/subjectAltName validation
         * DANE validation
         * CAA validation, if applicable
* User interface
    * Unsupported file type download
    * Export server certificate known base
* Gopher Proxy
* Gemini Proxy
    * Better error management (e.g. TLS errors)
