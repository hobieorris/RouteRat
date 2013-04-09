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
//	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
//	INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//	PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
//	HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION 
//	OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
//	SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
/////////////////////////////////////////////////////////////////////////////////


// Import the page-mod API
var pageMod = require("page-mod");
// Import the self API
var self = require("self");
var data = self.data;
var tabs = require("tabs");

var		main_page	= "http://clients.teksavvy.com/~hobie/routerat/main.html";

//** MAPS control **//

var		gpxRoute;
var		fileName;
var 	map_pageworker;

// Install menu item in Tools
var menuitem = require("menuitems").Menuitem({
	id: "rat",
	menuid: "menu_ToolsPopup",
	label: "Route Rat",
	onCommand: function() 
	{
		console.log("menu clicked");
		map_pageworker.port.emit("getRoute", "Page matches ");
	},
	insertbefore: "menu_pageInfo"
});


// Create a page mod
// It will run a script whenever URL is loaded
// The script replaces the page contents with a message
pageMod.PageMod({
	include: ["*.maps.google.com",
				"*.maps.google.at",
				"*.maps.google.com.au",
				"*.maps.google.com.ba",
				"*.maps.google.be",
				"*.maps.google.com.br",
				"*.maps.google.ca",
				"*.maps.google.ch",
				"*.maps.google.cz",
				"*.maps.google.de",
				"*.maps.google.dk",
				"*.maps.google.es",
				"*.maps.google.fi",
				"*.maps.google.fr",
				"*.maps.google.it",
				"*.maps.google.jp",
				"*.maps.google.nl",
				"*.maps.google.no",
				"*.maps.google.co.nz",
				"*.maps.google.pl",
				"*.maps.google.ru",
				"*.maps.google.se",
				"*.maps.google.tw",
				"*.maps.google.co.uk"],
	contentScriptFile: [data.url("jquery-1.7.1.min.js"), data.url("gmaptogpx.js"), data.url("google-control.js")],
	contentScriptWhen: 'ready',
	// Send the content script a message inside onAttach
	onAttach: function(worker) 
	{
		map_pageworker = worker; // save for menu click
		map_pageworker.port.emit("attach", "main start");
		// Receive the route from Google Maps
		map_pageworker.port.on('ratEvent', function(payload) 
		{
			console.log("main received: " + payload);
			gpxRoute = payload;
			tabs.open(main_page);
		});  
	}
});	

//** GPS control **//

var tab_worker;

// Create a tab containing the Garmin Communicator plugin
tabs.on("ready", function(tab) {
  tab_worker = tab.attach({
    contentScriptFile:[ data.url("jquery-1.7.1.min.js"), data.url("garmin-control.js") ]
  });
  // Send route when garmin page is ready to go
	tab_worker.port.on("unlocked", function(text) {
		console.log("main got message: " + text);
		tab_worker.port.emit("sendRoute", gpxRoute);
	});
	// 'Exit' button clicked
	tab_worker.port.on("routeroute-close", function() {
		console.log("close tab");
		tab_worker.tab.close();
	});
		
});
