/*
jQuery.msgBox plugin 
Copyright 2011, Halil İbrahim Kalyoncu
License: BSD
modified by Oliver Kopp, 2012.
 * added support for configurable image paths
 * a new msgBox can be shown within an existing msgBox
*/

// users may change this variable to fit their needs
var msgBoxImagePath = "Images/";

jQuery.msgBox = msg;
function msg (options) {
    var isShown = false;
    var typeOfValue = typeof options;
    var defaults = {
        content: (typeOfValue == "string" ? options : "Message"),
        title: "Warning",
        type: "alert",
        autoClose: false,
        timeOut: 0,
        showButtons: true,
        buttons: [{ value: "Ok"}],
        inputs: [{ type: "text", name:"userName", header: "User Name" }, { type: "password",name:"password", header: "Password"}],
        success: function (result) { },
        beforeShow: function () { },
        afterShow: function () { },
        beforeClose: function () { },
        afterClose: function () { },
        opacity: 0.1
    };
    options = typeOfValue == "string" ? defaults : options;
    if (options.type != null) {
        switch (options.type) {
            case "alert":
                options.title = options.title == null ? "Warning" : options.title;
                break;
            case "info":
                options.title = options.title == null ? "Information" : options.title;
                break;
            case "error":
                options.title = options.title == null ? "Error" : options.title;
                break;
            case "confirm":
                options.title = options.title == null ? "Confirmation" : options.title;
                options.buttons = options.buttons == null ? [{ value: "Yes" }, { value: "No" }, { value: "Cancel"}] : options.buttons;
                break;
            case "prompt":
                options.title = options.title == null ? "Log In" : options.title;
                options.buttons = options.buttons == null ? [{ value: "Login" }, { value: "Cancel"}] : options.buttons;
                break;
            default:
                image = "alert.png";
        }
    }
    options.timeOut = options.timeOut == null ? (options.content == null ? 500 : options.content.length * 70) : options.timeOut;
    options = jQuery.extend(defaults, options);
    if (options.autoClose) {
        setTimeout(hide, options.timeOut);
    }
    var image = "";
    switch (options.type) {
        case "alert":
            image = "alert.png";
            break;
        case "info":
            image = "info.png";
            break;
        case "error":
            image = "error.png";
            break;
        case "confirm":
            image = "confirm.png";
            break;
        default:
            image = "alert.png";
    }
    
    var divId = "msgBox" + new Date().getTime();
    
    var divMsgBoxId = divId; 
    var divMsgBoxContentId = divId+"Content"; 
    var divMsgBoxImageId = divId+"Image";
    var divMsgBoxButtonsId = divId+"Buttons";
    var divMsgBoxBackGroundId = divId+"BackGround";
    
    var buttons = "";
    jQuery(options.buttons).each(function (index, button) {
        buttons += "<input class=\"activebutton\" type=\"button\" name=\"" + button.value + "\" value=\"" + button.value + "\" />";
    });

    var inputs = "";
    jQuery(options.inputs).each(function (index, input) {
        var type = input.type;
        if (type=="checkbox" || type =="radiobutton") {
            inputs += "<div class=\"msgInput\">" +
            "<input type=\"" + input.type + "\" name=\"" + input.name + "\" "+(input.checked == null ? "" : "checked ='"+input.checked+"'")+" value=\"" + (typeof input.value == "undefined" ? "" : input.value) + "\" />" +
            "<text>"+input.header +"</text>"+
            "</div>";
        }
        else {
            inputs += "<div class=\"msgInput\">" +
            "<span class=\"msgInputHeader\">" + input.header + "<span>" +
            "<input type=\"" + input.type + "\" name=\"" + input.name + "\" value=\"" + (typeof input.value == "undefined" ? "" : input.value) + "\" />" +
            "</div>";
        }
    });

    var divBackGround = "<div id=" + divMsgBoxBackGroundId + " class=\"msgBoxBackGround\"></div>";
    var divTitle = "<div class=\"msgBoxTitle\">" + options.title + "</div>";
    var divContainer = "<div class=\"msgBoxContainer\"><div id=" + divMsgBoxImageId + " class=\"msgBoxImage\"><img src=\"" + msgBoxImagePath + image + "\"/></div><div id=" + divMsgBoxContentId + " class=\"msgBoxContent\"><p><span>" + options.content + "</span></p></div></div>";
    var divButtons = "<div id=" + divMsgBoxButtonsId + " class=\"msgBoxButtons\">" + buttons + "</div>";
    var divInputs = "<div class=\"msgBoxInputs\">" + inputs + "</div>";

    var divMsgBox; 
    var divMsgBoxContent; 
    var divMsgBoxImage;
    var divMsgBoxButtons;
    var divMsgBoxBackGround;
    
    if (options.type == "prompt") {
        jQuery("html").append(divBackGround + "<div id=" + divMsgBoxId + " class=\"msgBox\">" + divTitle + "<div>" + divContainer + (options.showButtons ? divButtons + "</div>" : "</div>") + "</div>");
        divMsgBox = jQuery("#"+divMsgBoxId); 
        divMsgBoxContent = jQuery("#"+divMsgBoxContentId); 
        divMsgBoxImage = jQuery("#"+divMsgBoxImageId);
        divMsgBoxButtons = jQuery("#"+divMsgBoxButtonsId);
        divMsgBoxBackGround = jQuery("#"+divMsgBoxBackGroundId);

        divMsgBoxImage.remove();
        divMsgBoxButtons.css({"text-align":"center","margin-top":"5px"});
        divMsgBoxContent.css({"width":"100%","height":"100%"});
        divMsgBoxContent.html(divInputs);
    }
    else {
        jQuery("html").append(divBackGround + "<div id=" + divMsgBoxId + " class=\"msgBox\">" + divTitle + "<div>" + divContainer + (options.showButtons ? divButtons + "</div>" : "</div>") + "</div>");
        divMsgBox= jQuery("#"+divMsgBoxId); 
        divMsgBoxContent = jQuery("#"+divMsgBoxContentId); 
        divMsgBoxImage = jQuery("#"+divMsgBoxImageId);
        divMsgBoxButtons = jQuery("#"+divMsgBoxButtonsId);
        divMsgBoxBackGround = jQuery("#"+divMsgBoxBackGroundId);
    }

    var width = divMsgBox.width();
    var height = divMsgBox.height();
    var windowHeight = jQuery(window).height();
    var windowWidth = jQuery(window).width();

    var top = windowHeight / 2 - height / 2;
    var left = windowWidth / 2 - width / 2;

    show();

    function show() {
        if (isShown) {
            return;
        }
        divMsgBox.css({ opacity: 0, top: top - 50, left: left });
        divMsgBox.css("background-image", "url('"+msgBoxImagePath+"msgBoxBackGround.png')");
        divMsgBoxBackGround.css({ opacity: options.opacity });
        options.beforeShow();
        divMsgBoxBackGround.css({ "width": jQuery(document).width(), "height": getDocHeight() });
        jQuery(divMsgBoxId+","+divMsgBoxBackGroundId).fadeIn(0);
        divMsgBox.animate({ opacity: 1, "top": top, "left": left }, 200);
        setTimeout(options.afterShow, 200);
        isShown = true;
        jQuery(window).bind("resize", function (e) {
            var width = divMsgBox.width();
            var height = divMsgBox.height();
            var windowHeight = jQuery(window).height();
            var windowWidth = jQuery(window).width();

            var top = windowHeight / 2 - height / 2;
            var left = windowWidth / 2 - width / 2;

            divMsgBox.css({ "top": top, "left": left });
        });
    }

    function hide() {
        if (!isShown) {
            return;
        }
        options.beforeClose();
        divMsgBox.animate({ opacity: 0, "top": top - 50, "left": left }, 200);
        divMsgBoxBackGround.fadeOut(300);
        setTimeout(function () { divMsgBox.remove(); divMsgBoxBackGround.remove(); }, 300);
        setTimeout(options.afterClose, 300);
        isShown = false;
    }

    function getDocHeight() {
        var D = document;
        return Math.max(
        Math.max(D.body.scrollHeight, D.documentElement.scrollHeight),
        Math.max(D.body.offsetHeight, D.documentElement.offsetHeight),
        Math.max(D.body.clientHeight, D.documentElement.clientHeight));
    }

    function getFocus() {
    	divMsgBox.fadeOut(200).fadeIn(200);
    }

    jQuery("input.activebutton").click(function (e) {
        e.preventDefault();
        var value = jQuery(this).val();
        if (options.type != "prompt") {
            options.success(value);
        }
        else {
            var inputValues = [];
            jQuery("div.msgInput input").each(function (index, domEle) {
                var name = jQuery(this).attr("name");
                var value = jQuery(this).val();
                var type = jQuery(this).attr("type");
                if (type == "checkbox" || type == "radiobutton") {
                    inputValues.push({ name: name, value: value,checked: jQuery(this).attr("checked")});
                }
                else {
                    inputValues.push({ name: name, value: value });
                }
            });
            options.success(value,inputValues);
        }
        hide();
    });

    divMsgBoxBackGround.click(function (e) {
        if (!options.showButtons || options.autoClose) {
            hide();
        }
        else {
            getFocus();
        }
    });
};
