/*
  GMapToGPX 6.4j
  Originally based in part on the "Improved MSN and Google GPS GPX Waypoint 
  Extraction" bookmarklet described at http://badsegue.org/archives/2005/04/21/

  Josh Larios <hades@elsewhere.org>
  August 3, 2005 - July 12, 2011

  WARNING: Highly dependent on internal formats that aren't part of
  the API, so subject to complete breakdown at any time, outside my
  control.

  Gmap-pedometer elevation code courtesy of Mathew O'Brien.

  3/05/2007 - HeyWhatsThat.com code by mk -at- heywhatsthat.com
  10/09/2007 - Allpoints speed improvement by Kyle Yost

  TO DO: Separate out gpx writing and point/track extraction, so I can load
  some array up front regardless of whether it's a google map, a pedometer, 
  heywhatsthat, or whatever, and then just print the damn gpx once.
*/

var error = 0;
var version = '6.4j';
var googledoc = ""; // will hold retrieved google info
var googleurl = "";
var gpxvar = ""; // will hold gHomeVPage structure, even for IE
var routes = new Array();
var polylines = new Array();
var milestones = new Array();
var yelp = new Array();
var googlepage; // Will hold the page element that gets toggled. May change.
var charset;

function fixup (foo) {
    foo = foo.replace(/\\x3e/g, '>');
    foo = foo.replace(/\\x3c/g, '<');
    foo = foo.replace(/\\x26/g, '&');
    foo = foo.replace(/\\x42/g, '"');
    foo = foo.replace(/\\x3d/g, '=');
    
    foo = foo.replace(/\\u003e/g, '>');
    foo = foo.replace(/\\u003c/g, '<');
    foo = foo.replace(/\\u0026/g, '&');
    
    foo = foo.replace(/\\042/g, '"');

    foo = foo.replace(/"*polylines"*:\s*/g, 'polylines:');
    foo = foo.replace(/"*markers"*:\s*/g, 'markers:');
    foo = foo.replace(/"*id"*:\s*/g, 'id:');
    foo = foo.replace(/"*lat"*:\s*/g, 'lat:');
    foo = foo.replace(/"*lng"*:\s*/g, 'lng:');
    foo = foo.replace(/"*laddr"*:\s*/g, 'laddr:');
    foo = foo.replace(/"*points"*:\s*/g, 'points:');
    foo = foo.replace(/\\"/g, '"');
    foo = foo.replace(/\"/g, '\'');

    return foo;
}

function callInProgress (xmlhttp) {
    switch (xmlhttp.readyState) {
    case 1: case 2: case 3:
	return true;
	break;
	// Case 4 and 0
    default:
	return false;
	break;
    }
}

// Synchronous, with an alarm to catch timeouts (30 seconds)
// No idea if this is the best way to do this, but for sure the best way I
// came up with at 3 in the morning.
function loadXMLDoc(url) 
{
    var req;
    var timeoutid;
 
	if (window.XMLHttpRequest) 
	{
        req = new XMLHttpRequest();
		timeoutid = window.setTimeout( function(){if(callInProgress(req)){req.abort();}}, 30000);
        req.open("GET", url, false);
        req.send(null);
		window.clearTimeout(timeoutid);
	} 
	else if (window.ActiveXObject) 
	{
        req = new ActiveXObject("Microsoft.XMLHTTP");
        if (req) 
		{
			timeoutid = window.setTimeout( function(){if(callInProgress(req)){req.abort();}}, 30000);
            req.open("GET", url, false);
            req.send();
			window.clearTimeout(timeoutid);
        }
    }
    
    if (req.readyState == 4) 
	{
        // only if "OK"
        if (req.status == 200) 
		{
            return(req.responseText);
        } 
		else 
		{
			return('');
        }
    } 
	else 
	{
		return('');
    }
}


// This function is from Google's polyline utility.
function decodeLine (encoded) 
{
    var len = encoded.length;
    var index = 0;
    var array = [];
    var lat = 0;
    var lng = 0;
    
    while (index < len) 
	{
		var b;
		var shift = 0;
		var result = 0;
		do 
		{
			b = encoded.charCodeAt(index++) - 63;
			result |= (b & 0x1f) << shift;
			shift += 5;
		} while (b >= 0x20);

		var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
		lat += dlat;
		
		shift = 0;
		result = 0;
		do 
		{
			b = encoded.charCodeAt(index++) - 63;
			result |= (b & 0x1f) << shift;
			shift += 5;
		} while (b >= 0x20);

		var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
		lng += dlng;

		array.push({"lat": round(lat * 1e-5), "lon": round(lng * 1e-5)});
    }
    
    return array;
}

function StringBuffer() 
{
   this.buffer = [];
}

StringBuffer.prototype.append = function append(string) 
{
   this.buffer.push(string);
   return this;
};

StringBuffer.prototype.toString = function toString() 
{
   return this.buffer.join("");
};



function gmaptogpxdiv(dtype) 
{ 
    var mypoints = null;
    
    var qtype = 0;
    var subtype = 0;
    
    /* 
       Determine which type of data we're extracting -- a route, or points of
       interest. (Or gmap-pedometer/heywhatsthat.) 
    */
    
    if (gpxvar && gpxvar.overlays && gpxvar.overlays.polylines) 
	{
		qtype = 2;
		
		// Load "polylines" up with the decoded polyline segments
		for (i = 0; i < gpxvar.overlays.polylines.length; i++) 
		{
			polylines[i] = decodeLine(gpxvar.overlays.polylines[i].points);
		}
	
		// Stuff the descriptions into the "polylines" array
		if (segmatch = googledoc.match(/<span[^>]*class=.?dirsegtext.?.*?>.*?<\/span>/g)) 
		{
			for (var s = 0; s < segmatch.length; s++) 
			{
				var route = segmatch[s].replace(/.*dirsegtext_([0-9]+)_([0-9]+).*/, "$1");
				var step = segmatch[s].replace(/.*dirsegtext_([0-9]+)_([0-9]+).*/, "$2");
				var desc = deamp(segmatch[s].replace(/.*?>(.*?)<\/span>.*/, "$1"));
				var polyline = gpxvar.drive.trips[0].routes[route].steps[step].polyline;
				var ppt = gpxvar.drive.trips[0].routes[route].steps[step].ppt;
				polylines[polyline][ppt].desc = deamp(desc);
			}
		}
		
		// Figure out which polylines go into which routes
		for (i = 0; i < gpxvar.drive.trips[0].routes.length; i++) 
		{
			var start = gpxvar.drive.trips[0].routes[i].steps[0].polyline;
			var end = gpxvar.drive.trips[0].routes[i].steps[gpxvar.drive.trips[0].routes[i].steps.length - 1].polyline;
			var route = "route" + i;
			routes[route] = new Array();
			for (n = start; n <= end; n++) 
			{
				routes[route] = routes[route].concat(polylines[n]);
			}
		}
		
		// Get the milestone descriptions
		var msaddrmatch;
		if (msaddrmatch = gpxvar.panel.match(/<div[^>]*id=.?sxaddr.*?>.*?<\/div>/g)) 
		{
			for (var i = 0; i < msaddrmatch.length; i++) 
			{
				milestones[parseInt(i)] = deamp(msaddrmatch[i].replace(/<div[^>]*id=.?sxaddr.?.*?><div[^>]+>(.*?)<\/div>/, "$1"));
			}
		}

    } 
	else  if (googledoc.match(/id:'(A|addr)'/)) 
	{
		qtype = 1;
		routes['poi'] = new Array();

		for (var i = 0; i < gpxvar.overlays.markers.length; i++) 
		{
			var desc = gpxvar.overlays.markers[i].laddr;
			desc = desc.replace(/(.*) \((.*)\)/, "$2 ($1)");
			routes['poi'].push({"lat": round(gpxvar.overlays.markers[i].latlng.lat), "lon": round(gpxvar.overlays.markers[i].latlng.lng), "desc": deamp(desc)});
		}
    }
    
    /* gmap-pedometer.com */
	if ((document.location.hostname.indexOf('gmap-pedometer') >= 0) && (qtype==0) && (self.o) && (self.o[0])) 
	{ 
		qtype = 3; 
    }

    /* Things which work like gmap-pedometer used to. */
    if ( (qtype==0) && (self.gLatLngArray) && (self.gLatLngArray[0]) ) 
	{ 
		qtype = 3;
		subtype = 1;
    }

    
    /* HeyWhatsThat.com list of peaks visible from given location */
    if (qtype == 0 && location.href.match(/heywhatsthat.com/i) && peaks && peaks.length) 
	{
		qtype = 4;	
		subtype = 1;
    }

    /* Yelp.com search */
    if (qtype == 0 && location.href.match(/yelp.com/i) && document.body.innerHTML.match('result_plot_obj.map.addOverlay')) 
	{
		qtype = 4;
		subtype = 2;
		var yelpmatch = document.body.innerHTML.match(/result_plot_obj.map.addOverlay.*?\)\)/g);
		for (var i = 0; i < yelpmatch.length; i++) 
		{	
			yelp[i] = new Array();
			yelp[i].name = deamp(yelpmatch[i].replace(/.*<h3>(.*?)<\/h3>.*/, "$1"));
			yelp[i].addr = deamp(yelpmatch[i].replace(/.*<address[^>]*>(.*?)<\/address>.*/, "$1"));
			yelp[i].lon = yelpmatch[i].replace(/.*Yelp.TSRUrl.*?,.*?,.*?, (.*?),.*/, "$1");
			yelp[i].lat = yelpmatch[i].replace(/.*Yelp.TSRUrl.*?,.*?,.*?,.*?, (.*?),.*/, "$1");
		}
    }
    /* Yelp.com single location */
    if (qtype == 0 && location.href.match(/yelp.com/i) && json_biz) 
	{
		qtype = 4;
		subtype = 2;
		yelp[0] = new Array();
		yelp[0].name = json_biz.name;
		yelp[0].lat = json_biz.latitude;
		yelp[0].lon = json_biz.longitude;
		yelp[0].addr = json_biz.address1 + ", ";
		if (json_biz.address2 != null) 
		{
			yelp[0].addr += json_biz.address2 + ", ";
		}
		yelp[0].addr += json_biz.city + ", " + json_biz.state + " " + json_biz.zip;
    }

    /* findmespot.com */
    if (qtype == 0 && location.href.match(/findmespot.com/i) && document.getElementsByTagName('iframe')[1] && document.getElementsByTagName('iframe')[1].contentDocument.getElementById('mapForm:inputHidden1').value) 
	{
		qtype = 4;
		subtype = 3;
    }

   /* logyourrun.com */
   if (qtype == 0 && location.href.match(/logyourrun.com/i) && route_polyline) 
   {
		qtype = 4;
		subtype =  4;
   }

    if (qtype==0) 
	{
		return(0); 
    }


    /* t contains the text that will be injected into a <div> overlay */
    var t="";
    
     
    /* This part of the GPX is going to be the same no matter what. */
    t+= '<?xml version="1.0" encoding="' + charset + '" ?>\n' + 
	'<gpx version="1.1"\n' + 
	'     creator="GMapToGPX ' + version + ' - http://www.elsewhere.org/GMapToGPX/"\n' + 
	'     xmlns="http://www.topografix.com/GPX/1/1"\n' + 
	'     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' + 
	'     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n';

    if ((qtype==2) && (dtype=="allpoints")) 
	{
		var title = "Driving directions";
		t+= '   <trk>\n';
		t+= '      <name>Google Driving Directions Track</name>\n';
		var buf = new StringBuffer;
		for (var key in routes) 
		{
			var route = routes[key];
			buf.append("      <trkseg>\n");
			for(i=0;i<route.length;i++) 
			{
				if (i == route.length - 1) 
				{
					route[i].desc = milestones[1 + parseInt(key.replace(/route/,''))];
				} 
				else if ((route[i].lat == route[i+1].lat) && (route[i].lon == route[i+1].lon)) 
				{
					continue;
				}
				buf.append("      <trkpt lat=\"");
				buf.append(route[i].lat);
				buf.append("\" lon=\"");
				buf.append(route[i].lon);
				buf.append("\">");
				if (route[i].desc) 
				{
					buf.append("<cmt>");
					buf.append(deamp(route[i].desc));
					buf.append("</cmt>");
				}
				buf.append("</trkpt>\n");
			}
			buf.append("      </trkseg>\n");
		}
		buf.append("   </trk>\n");
		t+= buf.toString();

		} 
		else if (qtype == 3) 
		{
			var pl = "";
			if (self.O && (self.O.length > 0)) 
			{
				pl = "http://www.gmap-pedometer.com/?r=" + self.O;
			} 
			else 
			{
				pl = "Permalink unavailable.";
			}
			//	New array variables after obfuscation. --RJL20
			if ( subtype == 0 ) 
			{
				var elevationArray = A;
				var gLatLngArray = o;
			} 
			else 
			{
				var elevationArray = [];
				var gLatLngArray = self.gLatLngArray;
			}
		var elevationArrayTested = true;                
		// 1st make sure that the gmap elevation array is the same length as 
		// the LatLng array
		if ( (typeof(elevationArray) != 'undefined') && (gLatLngArray.length == elevationArray.length) ) 
		{
			// Next test all of the elevation data in the array, looking for 
			// bad elevation data
			// -1.79769313486231E+308 means no valid elevation value was 
			// found at that point
			for (var e =0;e<elevationArray.length;e++)
			{
				if (elevationArray[e] == "-1.79769313486231E+308") 
				{
					elevationArrayTested = false;
				}
			}
		} 
		else 
		{
			elevationArrayTested = false;
		}

		if (dtype == "track") 
		{
			t+= '   <trk>\n';
			t+= '      <name>Gmaps Pedometer Track</name>\n' +
			'      <cmt>Permalink: &lt;![CDATA[\n' + pl + '\n]]>\n</cmt>\n';
			t+= '      <trkseg>\n';
		} 
		else if (dtype == "route") 
		{
			t+= '   <rte>\n';
			t+= '      <name>Gmaps Pedometer Route</name>\n' +
			'      <cmt>Permalink: &lt;![CDATA[\n' + pl + '\n]]>\n</cmt>\n';
		}
		for(var i=0;i<gLatLngArray.length;i++)
		{
			if (dtype == "track") 
			{
				t+= '      <trkpt ';
			} else if (dtype == "route") 
			{
				t+= '      <rtept ';
			} else if (dtype == "points") 
			{
				t+= '      <wpt ';
			}
			t+= 'lat="' + round(gLatLngArray[i].y) + '" ' +
			'lon="' + round(gLatLngArray[i].x) + '">\n';


			if ( elevationArrayTested == true ) 
			{
				var currentElevation = 0;
				currentElevation = elevationArray[i];              
				currentElevation = round(currentElevation * 0.3048)     
				t+= '         <ele>' + currentElevation  + '</ele>\n';
			}

			t+= '         <name>' + (i ? 'Turn ' + i : 'Start') + '</name>\n';

			if (dtype == "track") 
			{
				t+= '      </trkpt>\n';
			} 
			else if (dtype == "route") 
			{
				t+= '      </rtept>\n';
			} else if (dtype == "points") 
			{
				t+= '      </wpt>\n';
			}
		}
		if (dtype == "track") 
		{
			t+= '      </trkseg>\n';
			t+= '   </trk>\n';
		} 
		else if (dtype == "route") 
		{
			t+= '   </rte>\n';
		}
		} else if (qtype == 4 && subtype == 1) 
		{
		/* HeyWhatsThat.com list of peaks */
		for (var i = 0; i < peaks.length; i++) 
		{
			var p = peaks[i];
			t+= '   <wpt lat="' + p.lat + '" lon="' + p.lon + '">\n' +
			'      <ele>' + p.elev + '</ele>\n' +
			'      <name>' + p.name + '</name>\n' +
			'      <cmt>' + p.name + '</cmt>\n' +
			'   </wpt>\n';
		}
    } 
	else if (qtype == 4 && subtype == 2) 
	{
		for (var i = 0; i < yelp.length; i++) 
		{
			var p = yelp[i];
			t+= '   <wpt lat="' + p.lat + '" lon="' + p.lon + '">\n' +
			'      <name>' + p.name + '</name>\n' +
			'      <cmt>' + p.addr + '</cmt>\n' +
			'   </wpt>\n';
		}
    } 
	else if (qtype == 4 && subtype == 3) 
	{
        var spotdata = document.getElementsByTagName('iframe')[1].contentDocument.getElementById('mapForm:inputHidden1').value;
        var loc_array = spotdata.split(",");
        var loc_length = loc_array.length - 1;
		t += '  <trk><trkseg>\n';
        for(var i=0;i<loc_length;i++)
		{
            var loc_point = loc_array[i].split("||");
            var esn = loc_point[0];
            var lat = loc_point[1];
            var lon = loc_point[2];
            var type = loc_point[3];
            var dtime = loc_point[4];
			t+= '   <trkpt lat="' + lat + '" lon="' + lon + '">\n' +
			'      <name>' + i + '-' + type + '</name>\n' +
			'      <cmt>' + type + ' ' + esn +  ' @ ' + dtime + '</cmt>\n' +
			'      <desc>' + type + ' ' + esn + ' @ ' + dtime + '</desc>\n' +
			'   </trkpt>\n';
        }
		t += '  </trkseg></trk>\n';
    } 
	else if (qtype == 4 && subtype == 4) 
	{
		var lyr = decodeLine(route_polyline);
		t += '  <trk><trkseg>\n';
		for (var i = 0; i < lyr.length; i++) 
		{
			t+= '   <trkpt lat="' + lyr[i].lat + '" lon="' + lyr[i].lon + '">\n' ;
			t+= '      <name>LYR' + i + '</name>\n' + '   </trkpt>\n';
		}
		t += '  </trkseg></trk>\n';
    } 
	else if (qtype == 2) 
	{
		/* If we're on a page with driving directions, spit out a route. */
		var title = "Driving directions";
		
		if (dtype == "track") 
		{
			t+= '   <trk>\n';
		} 
		
		var turn = 1;
		var milestone = 1;
		
		for (var key in routes) 
		{
			var route = routes[key];
			var routeno = key.replace(/route/, '');
			routeno = parseInt(routeno);
			if (dtype == "track") 
			{
				t+= '   <trkseg>\n';
			} else if (dtype == "route") 
			{
				t+= '   <rte>\n';
			}
			
			if ((dtype=="track") || (dtype=="route")) 
			{
				t+= '      <name>' + key + '</name>\n';
				t+= '      <cmt>' + milestones[routeno] + " to " + milestones[routeno + 1] + '</cmt>\n'; 
				t+= '      <desc>' + milestones[routeno] + " to " + milestones[routeno + 1] + '</desc>\n'; 
			}

			for(i=0;i<route.length;i++)
			{	
				if ((i != route.length - 1) && (route[i].desc == undefined)) 
				{
					continue;
				} 
				// Only print turn points and milestones (last point is an
				// undescribed milestone; first point should always have a
				// description).
				switch(dtype) 
				{
					case 'track':
						t+= '      <trkpt ';
						break;
					case 'route':
						t+= '      <rtept ';
						break;
					case 'points':
						t+= '      <wpt ';
						break;
				}
				t+= 'lat="' + route[i].lat + '" ' +
					'lon="' + route[i].lon + '">\n' +
					'         <name>';
				if (i == route.length - 1) 
				{
					route[i].desc = milestones[routeno+1];

					t += 'GMLS-' + ((milestone < 100) ? '0' : '') + 
					((milestone < 10) ? '0' : '') + milestone;
					milestone += 1;
					turn -= 1;
				} 
				else 
				{
					t += 'GRTP-' + ((turn < 100) ? '0' : '') + 
					((turn < 10) ? '0' : '') + turn;
				}
				t += '</name>\n' +
					'         <cmt>' + route[i].desc + '</cmt>\n' +
					'         <desc>' + route[i].desc + '</desc>\n';

				switch(dtype) 
				{
					case 'track':
						t+= '      </trkpt>\n';
						break;
					case 'route':
						t+= '      </rtept>\n';
						break;
					case 'points':
						t+= '      </wpt>\n';
						break;
				}
				turn++;
			}
			if (dtype == "track") 
			{
				t+= '   </trkseg>\n';
			} else if (dtype == "route") 
			{
				t+= '   </rte>\n';
			}
		}
		
		if (dtype == "track") 
		{
			t+= '   </trk>\n';
		} 	
    } // 2
	else if (qtype == 1) 
	{
		/* This is a page with points of interest - spit out waypoints. */
		for(i=0;i<routes['poi'].length;i++)
		{
			var point = routes['poi'][i];
			t+= '   <wpt lat="' + point.lat + '" lon="' + point.lon + '">\n' +
			'      <name>' + point.desc + '</name>\n' +
			'      <cmt>' + point.desc.replace(/(.*) \((.*)\)/, "$2 ($1)") + '</cmt>\n' +
			'      <desc>' + point.desc.replace(/(.*) \((.*)\)/, "$2 ($1)") + '</desc>\n' +
			'   </wpt>\n';
		}
    } // 1
	else 
	{
		error = 1;
    }
    
    t+='</gpx>\n';
	return t;
}


/* Clean up floating point math errors */
function round(a) 
{
    return parseInt(a*1E+5)/1E+5;
}

function reload(t) 
{
    if (t==0) 
	{
		gmaptogpxdiv("route");
    } 
	else if (t=="1") 
	{
		gmaptogpxdiv("track");
    } 
	else if (t=="2") 
	{
		gmaptogpxdiv("points");
    } 
	else if (t=="3") 
	{
		gmaptogpxdiv("allpoints");
    }
}



function deamp(a) 
{
    a = a.replace(/<br *\/>(.+)/g, ", $1");
    a = a.replace(/<br *\/>/g, '');
    a = a.replace(/&#39;/g, '\'');
    a = a.replace(/\\047/g, '\'');
    a = a.replace(/\\042/g, '\"');
    a = a.replace(/&#160;/g, ' ');
    a = a.replace(/<\/*b>/g, '');
    a = a.replace(/<wbr\/*>/g, '');
    a = a.replace(/<div[^>]*?>.*?<\/div>/g, ' ');
    a = a.replace(/\\\'/g, '\''); 
    a = a.replace(/\\\"/g, '\"');
    a = a.replace(/\\x26/g, '&');
    a = a.replace(/&/g, '&amp;');  
    a = a.replace(/&amp;amp;amp;/g, '&amp;amp;');
    a = a.replace(/\\n/g, '');
    a = a.replace(/\\t/g, '');
    a = a.replace(/\s+/g, ' ');
    a = a.replace(/^\s+/, '');
    a = a.replace(/\s+$/, '');
    
    a = a.replace(/<[^>]+>/, ''); // This may be overkill.
    return a;
}
		  

function gmaptogpxmain()
{
	// Hobie: get the Firefox content-proxy document, rather than just 'document'
	var doc=window.content.document;
	
	if (doc.location.hostname.indexOf('google') >= 0) 
	{
		var kmlurl = doc.getElementById('link');
		if (kmlurl != null &&  (kmlurl.href) && (kmlurl.href.indexOf('msid=') > 0) ) 
		{
			kmlurl = kmlurl + '&output=kml';
			error = 1;
		}

		if (!error) 
		{
			// bar_icon_link is the "link to this page" icon. If they change 
			// its name, I need to fix that here.
			googleurl=doc.getElementById('link').href;

			if (typeof googleurl !== 'undefined') 
			{
				googleurl = googleurl.replace(/&view=text/, '');
				googledoc = loadXMLDoc(googleurl);
				
				charset=googledoc.slice(googledoc.indexOf('charset='));
				charset=charset.slice(8, charset.indexOf('"'));
				
				// Doing this as a regexp was causing firefox to stall out. bah.
				var encpointblob=googledoc.slice(googledoc.indexOf('gHomeVPage='));
				encpointblob=encpointblob.slice(0, encpointblob.indexOf('};') + 2);
				encpointblob=encpointblob.replace(/gHomeVPage/, "gpxvar");
				eval(encpointblob);
				
				var panel=googledoc.slice(googledoc.indexOf('id="panel_dir"'));
				panel=panel.slice(0,panel.indexOf('Map data'));
				gpxvar.panel = panel;
				googledoc=fixup(googledoc);
			}
		}
	}

	charset = charset ? charset : "UTF-8";

	/* This bit of code was causing Safari to seriously freak out, hence the 
	   stylesheet being included above in t, but only for Safari.  */
	if (! navigator.userAgent.match(/Safari/)) 
	{
		var styleObject = document.getElementsByTagName("HEAD")[0].appendChild(document.createElement("link"));
		styleObject.rel="Stylesheet";
		styleObject.type="text/css";
		styleObject.href="http://www.elsewhere.org/GMapToGPX/menubar.css";
		styleObject.id="sst_css";
	}

	if (error != 1) 
	{
		/* Default action. If it's not a route, the argument doesn't matter. */
	  return gmaptogpxdiv("route");
	} 
}
