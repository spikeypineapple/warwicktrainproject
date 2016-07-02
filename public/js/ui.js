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
  value: 832
})

temps.push(new JustGage({
  id: 'c1temp',
  min: 0,
  max: 80,
  title: 'Cont1 Temp',
  defaults: dflt,
  value: 23
}));
temps.push(new JustGage({
  id: 'c2temp',
  min: 0,
  max: 80,
  title: 'Cont2 Temp',
  defaults: dflt,
  value: 22

}));
temps.push(new JustGage({
  id: 'fctemp',
  min: 0,
  max: 80,
  title: 'FC Temp',
  defaults: dflt,
  value: 60

}));
temps.push(new JustGage({
  id: 'dcdctemp',
  min: 0,
  max: 80,
  title: 'DCDC Temp',
  defaults: dflt,
  value: 32
}));
temps.push(new JustGage({
  id: 'm1temp',
  min: 0,
  max: 80,
  title: 'M1 Temp',
  defaults: dflt,
  value: 28
}));
temps.push(new JustGage({
  id: 'm2temp',
  min: 0,
  max: 80,
  title: 'M2 Temp',
  defaults: dflt,
  value: 27
}));
temps.push(new JustGage({
  id: 'm3temp',
  min: 0,
  max: 80,
  title: 'M3 Temp',
  defaults: dflt,
  value: 29
}));
temps.push(new JustGage({
  id: 'm4temp',
  min: 0,
  max: 80,
  title: 'M4 Temp',
  defaults: dflt,
  value: 31
}));
/*
temps.push(new JustGage({
  id: 'c3temp',
  min: 0,
  max: 80,
  title: 'C3 Temp',
  defaults: dflt
}));
temps.push(new JustGage({
  id: 'c4temp',
  min: 0,
  max: 80,
  title: 'C4 Temp',
  defaults: dflt
}));
*/
var currents = new Array();
currents.push(new JustGage({
  id: 'c1current',
  title: 'C1 Amps',
  defaults: dflt,
  min: 0,
  max: 20,
  value: 8

}));

currents.push(new JustGage({
  id: 'c2current',
  title: 'C2 Amps',
  defaults: dflt,
  min: 0,
  max: 20,
  value: 8

}));
currents.push(new JustGage({
  id: 'c3current',
  title: 'C3 Amps',
  defaults: dflt,
  min: 0,
  max: 20,
  value: 8

}));

currents.push(new JustGage({
  id: 'c4current',
  title: 'C4 Amps',
  defaults: dflt,
  min: 0,
  max: 20,
  value: 8

}));

var voltages = new Array();

voltages.push(new JustGage({
  id: 'fcvoltage',
  title: 'FC Voltage',
  defaults: dflt,
  min: 0,
  max: 50,
  value: 38
}));

voltages.push(new JustGage({
  id: 'ucvoltage',
  title: 'UC Voltage',
  defaults: dflt,
  min: 0,
  max: 60,
  value: 34
}));
voltages.push(new JustGage({
  id: 'batvoltage',
  title: 'Batt Voltage',
  defaults: dflt,
  min: 0,
  max: 27,
  value: 26
}));



var ws = new WebSocket("ws://"+location.hostname+":8001");
var requestedSpeed = 0;
ws.onopen = function (event) {
    $('p.status span').text('connected');
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

$('button.pump').on('click', function() {
    // Send the command to turn on the pump
    ws.send('P');
});

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

function updatePower() {
    var c = currentData[0] + currentData[1] + currentData[2] + currentData[3];
    var p = c*batv;
    power.refresh(p);
}
