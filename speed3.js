var Gpio = require('onoff').Gpio,
  sensor = new Gpio(25, 'in', 'falling');

var counts = [];

sensor.watch(function(err, value) {
	console.log(counts.unshift(Date.now()));
    console.log('Speed: '+calculateSpeed()+' rpm');
    console.log('Counts: '+counts.length);
});

function calculateSpeed() {
    var timeDiff = 1000/(counts[0] - counts[1]) * 60;
    return timeDiff;
}


/*
var calcInterval = 500;
var magsOnDisc = 4;
function calculateSpeed() {
    var now = Date.now();
    var then = now = calcInterval;
    // How many results have we got in this time frame
    var done = false;
    var results = 0;
    var i = 0;
    while(!done) {
        if(counts[i] > then) {
            results = results + 1;
        } else {
            done = true;
        }
        i = i + 1;
    }
    // How many counts per second
    var cps = results / calcInterval; // Counts per millisecond
    var rpm = (cps / magsOnDisc) / (1000*60);

    // Now delete everything too old as we dont need it
    counts = counts.splice(results + 1, counts.length - results);


    return rpm;
}*/
