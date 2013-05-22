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

//
//	Class for talking to the Garmin Device Control
//

var RatControl = Class.create();
RatControl.prototype = 
{	
	overwrite:true,	// controls message display only
	
	initialize: function() { 
		this.deviceNumber= 0;
		this.deviceName = '';
		this.deviceID=0;
	},
	
	listDevices: function(devices) 
	{
		for( var i=0; i < devices.length; i++ ) 
		{
          	this.showDeviceInfo(devices[i]);
 		}
	},
	
	showDeviceInfo: function(device) 
	{
		
		var dataTypes = device.getDeviceDataTypes().values();		
		var typeListSize = dataTypes.length;
		// SD cards have 3 allowable data types, just assuming only Garmins have more 
		if (typeListSize > 3)	 
		{
			this.deviceNumber= device.getNumber();
			this.deviceName= device.getDisplayName();
			this.deviceID=device.getId();
		}
		else
			console.log("Non-Garmin device found: " + device.getDisplayName());
	},

	onStartFindDevices: function(json) 
	{
         say("Looking for connected Garmin devices...");
    },

    onFinishFindDevices: function(json)
	{
		foundOne = false;
		try 
		{
			if (json.controller.numDevices > 0) 
			{
				var devices = json.controller.getDevices();
	
				this.listDevices(devices);	
				
				if (typeof this.deviceName !== 'undefined' && this.deviceName.length > 0)
				{
					say("Found <b>" + this.deviceName + "</b>");
					foundOne = true;
					jQuery("#find-device").slideUp();
					jQuery("#save_button").prop("disabled",false).removeClass("greybutton").addClass("activebutton");
				}
			}
		}
		catch (e) 
		{ 
			say("<span style='color:red'>Error: " + e.message + "</span>");
		}
		if (foundOne == false)
		{
			say("No Garmin device found");
			jQuery.msgBox({
				title: "Sorry",
				content: "No Garmin device found. Please plug in your device and select <i>Find Device</i> when it is ready",
				type: "error",
				buttons: [{ value: "Ok" }],
				success: function (result) { jQuery("#find-device").slideDown();  }
			});	
			
		}

    },
	
	handleException: function(error) 
	{
		var msg = error.name + ": " + error.message;	
		if (Garmin.PluginUtils.isDeviceErrorXml(error)) {
			msg = Garmin.PluginUtils.getDeviceErrorMessage(error);	
		}
		jQuery.msgBox({
			title: "Sorry",
			content: msg,
			type: "error",
			buttons: [{ value: "Ok" }],
			success: function (result) {  }
		});	
	},

	// Writing route
	
	onStartWriteToDevice: function(json) 
	{ 
		say("Writing route to the device");
    },

    onCancelWriteToDevice: function(json) 
	{ 
		jQuery("#save_button").prop("disabled",false).removeClass("greybutton").addClass("activebutton");
    	say("Writing cancelled");
    },

    /**
     * The device already has a file with this name on it.  Do we want to override?  1 is yes, 2 is no
     */ 
    onWaitingWriteToDevice: function(json) 
	{ 
        if(confirm(json.message.getText())) 
		{
            say('Overwriting route');
            json.controller.respondToMessageBox(true);
        } 
		else 
		{
            say('Will not overwrite route');
			this.overwrite = false;
            json.controller.respondToMessageBox(false);
        }
    },

    onProgressWriteToDevice: function(json) 
	{
		var progress = String(json.progress.percentage);
		if (progress != 'null' && progress.length > 0 && progress != '100')
			say("<br>" + progress + "% written");
    },

    onFinishWriteToDevice: function(json) 
	{
		if (this.overwrite == false)
			this.overwrite = true;
		else
			say("<br>Route successfully written!<br>Remember to import it before use.");
		jQuery("#save_button").prop("disabled",false).removeClass("greybutton").addClass("activebutton");
    },

    onException: function(json) 
	{
	    this.handleException(json.msg);
    }

}
