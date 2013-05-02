self.port.on("show", function (arg) {
  var close = document.getElementById('close-help');
  close.focus();

  close.addEventListener("click", function(event) {
     self.port.emit("close-help", "");
  },false);
});