if (navigator.geolocation) {
  console.log('Geolocation is supported!');
}
else {
  console.log('Geolocation is not supported for this Browser/OS version yet.');
}

function calculateSpeed(t1, lat1, lng1, t2, lat2, lng2) {
  // From Caspar Kleijne's answer starts
  /** Converts numeric degrees to radians */
  if (typeof(Number.prototype.toRad) === "undefined") {
    Number.prototype.toRad = function() {
      return this * Math.PI / 180;
    }
  }
  // From Caspar Kleijne's answer ends
  // From cletus' answer starts
  var R = 6371; // km
  var dLat = (lat2-lat1).toRad();
  var dLon = (lon2-lon1).toRad();
  var lat1 = lat1.toRad();
  var lat2 = lat2.toRad();

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) *    Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var distance = R * c;
  // From cletus' answer ends

  return distance / t2 - t1;
}

function firstGeolocationSuccess(position1) {
  var t1 = Date.now();
  navigator.geolocation.getCurrentPosition(
    function (position2) {
      var speed = calculateSpeed(t1 / 1000, position1.coords.latitude, position1.coords.longitude, Date.now() / 1000, position2.coords.latitude, position2.coords.longitude);
      $('label.speed').text(speed);
  });
}

navigator.geolocation.getCurrentPosition(firstGeolocationSuccess);


var temps = new Array();
var dflt = {
  hideInnerShadow: true,
  levelColorsGradient: false,
  noGradient: true,
  counter: false,
  pointer: true,
  customSectors: false,
  gaugeColor: '#fff',
  levelColors: ['#0099cc']
 /*value: 0,*/
}
var batv;
var totalCurrent;
var currentData = new Array();

var power = new JustGage({
  id: 'power',
  min: 0,
  max: 1000,
  title: 'Power',
  defaults: dflt,
  value: 0
})

temps.push(new JustGage({
  id: 'c1temp',
  min: 0,
  max: 80,
  title: 'Cont1 Temp',
  defaults: dflt,
  value: 0
}));
temps.push(new JustGage({
  id: 'c2temp',
  min: 0,
  max: 80,
  title: 'Cont2 Temp',
  defaults: dflt,
  value: 0

}));
var currents = new Array();
currents.push(new JustGage({
  id: 'c1current',
  title: 'C1 Amps',
  defaults: dflt,
  min: 0,
  max: 20,
  value: 0

}));

currents.push(new JustGage({
  id: 'c2current',
  title: 'C2 Amps',
  defaults: dflt,
  min: 0,
  max: 20,
  value: 0

}));
currents.push(new JustGage({
  id: 'c3current',
  title: 'C3 Amps',
  defaults: dflt,
  min: 0,
  max: 20,
  value: 0

}));

currents.push(new JustGage({
  id: 'c4current',
  title: 'C4 Amps',
  defaults: dflt,
  min: 0,
  max: 20,
  value: 0

}));

var voltages = new Array();

voltages.push(new JustGage({
  id: 'batvoltage',
  title: 'Batt Voltage',
  defaults: dflt,
  min: 0,
  max: 27,
  value: 0
}));



var ws = new WebSocket("ws://"+location.hostname+":8001");
var requestedSpeed = 0;
ws.onopen = function (event) {
    $('p.status span').text('connected');
    // Setup the heartbeat
    setInterval(function() {
        ws.send('O'); // O for OK
    }, 100);
};
ws.onmessage = function (event) {
    var data = event.data;
    // Incoming data
    // Second char is what type of data
    switch(data.charAt(1)) {
        case 'T':
            // Temperature update
            temps[data.charAt(3)-1].refresh(data.substring(5, data.length));
        break;
        case 'V':
            switch(data.charAt(3)) {
                case 'F':
                    voltages[0].refresh(data.substring(5, data.length));
                break;
                case 'S':
                    voltages[1].refresh(data.substring(5, data.length));
                break;
                case 'B':
                    voltages[2].refresh(data.substring(5, data.length));
                    batv = data.substring(5, data.length);
                    updatePower();
                break;
            }
        break;
        case 'A':
            currents[data.charAt(3)-1].refresh(data.substring(5, data.length));
            currentData[data.charAt(3)-1] = parseFloat(data.substring(5, data.length));
            updatePower();
            //currents[0].load({columns: [[ 'data', data.substring(3, data.length) ]]});
        break;
        case 'F':
            // Process fault flags
            updateFaultFlags(data.charAt(3), parseInt(data.substring(5, data.length)));
            // TODO
        break;
    }

}

var flags = [
  'Overheat',
  'Overvoltage',
  'Undervoltage',
  'Short Circuit',
  'Emergency Stop',
  'Sepex excitation fault',
  'MOSTFET failure',
  'Startup configuration fault'
];

updateFaultFlags = function(controller, code) {
    // Split into binary options
    // Foreach fault, create text. Put into controller box.
    if(code == 0) {
        $('span.controller'+controller+'-status').text('OK');
    } else {
        var binary = code.toString(2);
        $('span.controller'+controller+'-status').text(code+' - '+flags[binary.split('').reverse().join('').indexOf(1)]);
    }
}

ws.onerror = function(evt) {
    console.log('connection errror');
}

ws.onclose = function(evt) {
    $('p.status span').text('DISCONNECTED!');
}

$("input.power").on("input", function(){
    requestedSpeed = this.value*10  ;
    requestSpeed();
    $('span.currentValue').text(this.value);
});

function requestSpeed() {
    if(direction) {
        ws.send('S:+'+requestedSpeed);
        //console.log('Set forward speed: '+requestedSpeed);
    } else {
        ws.send('S:-'+requestedSpeed);
        //console.log('Set reverse speed: '+requestedSpeed);
    }
}

$('button.stopmotor').on('click', function() {
    requestedSpeed = 0;
    requestSpeed();
    $('span.currentValue').text(0);
    $('input.power').val(0);
});

var direction = true;

var brakes = true;

$('button.brakes').on('click', function() {
    // Send the command to change the brake status
    brakes = !brakes;
    if(brakes) {
        ws.send('B:1');
        $('button.brakes').text('Release Brakes');
        $('span.brakes.led').addClass('active');
    } else {
        ws.send('B:0');
        $('button.brakes').text('Apply Brakes');
        $('span.brakes.led').removeClass('active');
    }
});

$('button.direction').on('click', function() {
    // Store that we are now in reverse
    direction = !direction;
    if(direction) {
        $('span.direction').text('Forwards');
    } else {
        $('span.direction').text('Reverse');
    }
    requestedSpeed = 0;
    requestSpeed();
    $('span.currentValue').text(0);
    $('input.power').val(0);
});

$('button.estop').on('click', function() {
    // Store that we are now in reverse
    ws.send('E');
    requestedSpeed = 0;
    requestSpeed();
    $('span.currentValue').text(0);
    $('input.power').val(0);
});

$('button.horn').on('click', function() {
    // Store that we are now in reverse
    ws.send('H');
});

function updatePower() {
    var c = currentData[0] + currentData[1] + currentData[2] + currentData[3];
    var p = c*batv;
    power.refresh(p);
}
