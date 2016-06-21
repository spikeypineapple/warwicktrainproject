var gpio = require("pi-gpio");

var count = 0;
var start = Date.now();

setInterval(function() {
	// 
	gpio.read(16, function(err, value) {
		if(err) throw err;
		if(value) {
			count = count + 1;
			console.log('.');
			console.log(count/(Date.now()-start)+'cpm');
		}
	});
},25);
