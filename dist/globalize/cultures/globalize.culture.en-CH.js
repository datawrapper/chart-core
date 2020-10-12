/*
 * Globalize Culture en-US
 *
 */

(function( window, undefined ) {

var Globalize;

if ( typeof require !== "undefined" &&
	typeof exports !== "undefined" &&
	typeof module !== "undefined" ) {
	// Assume CommonJS
	Globalize = require( "globalize" );
} else {
	// Global variable
	Globalize = window.Globalize;
}

Globalize.addCultureInfo( "en-CH", "default", {
	name: "en-CH",
	englishName: "English (Switzerland)"
});

}( this ));
