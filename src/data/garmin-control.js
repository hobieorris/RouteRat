/////////////////////////////////////////////////////////////////////////////////
//
//	Route Rat
//	Copyright (c) 2013 Hobie Orris
//
//	Permission is hereby granted, free of charge, to any person obtaining a copy 
//	of this software and associated documentation files (the "Software"), to deal 
//	in the Software without restriction, including without limitation the rights 
//	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
//	of the Software, and to permit persons to whom the Software is furnished to do so, 
//	subject to the following conditions:
//
//	The above copyright notice and this permission notice shall be included in all 
//	copies or substantial portions of the Software.
//
//	The Software shall be used for Good, not Evil
//
//	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
//	INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//	PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
//	HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION 
//	OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
//	SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
/////////////////////////////////////////////////////////////////////////////////


// Getting the route data
self.port.on('sendRoute', function(message) {
//	console.log('garmin-control: message from addon: ' + message);
	$(':input[name="gpxdata"]').html(message);
});

// Opening the tab
self.port.on("attach", function(message) {
//	console.log("garmin-control: content attached: " + message);
});

// Closing the tab
document.defaultView.addEventListener('message', function(event) {
//	console.log(event.data);
	if (event.data == "routeroute-close")
		self.port.emit("routeroute-close");
}, false);

self.port.emit("unlocked", "garmin-control is ready");
