// Structure of breadboard

// pi connector
// 4x optoisoaltor
// 4x transistor

// GPIO PIN -> Action -> Pin number

// 5 -> estopcommand -> 29
// 6 -> brakecommand -> 31
// 13 -> horncommand -> 33
// 12 -> tetherinput  -> 32
// 16 -> estopinput -> 36

// TODO add rpio.LOW to estop function

// Add the rpio library
var rpio = require('rpio');
rpio.open(29, rpio.OUTPUT, rpio.LOW);
rpio.open(31, rpio.OUTPUT, rpio.LOW);
rpio.open(33, rpio.OUTPUT, rpio.LOW);
rpio.open(32, rpio.INPUT, rpio.LOW);
rpio.open(36, rpio.INPUT, rpio.LOW);

var Controller = require('./controller.js');
var serialPort = require("serialport");
var SerialPort = serialPort.SerialPort; // localize object constructor

function Locomotive(){

    // Stores the brakes state
    this.brakes = true;
    // Stores the controller objects
    this.controllers = [];

    // Say hello
    console.log('Starting locomotive control server');

    // Setup the static webserver
    var express = require('express');
    var staticServerPort = 8000;
    console.log('Starting the static webserver on port: '+staticServerPort);
    this.staticServer = express();
    this.staticServer.use(express.static('public'));
    this.staticServer.listen(staticServerPort, function () {
      console.log('Static webserver started.');
    });

    // Setup the control websocket server
    var ws = require("nodejs-websocket");
    var controlServerPort = 8001;
    console.log('Starting the control server on port: '+controlServerPort);
    var self = this;
    this.wsServer = ws.createServer(function handleWSConnection (conn) {
        console.log('New websocket connection');
        // FIXME: probably not the best way to go about this...
        conn.on('close', function onWSConClose(code, reason) {
            console.log('Websocket connection closed, code: '+code+' reason: '+reason);
            console.log('Killing control server');
            process.exit(); // TODO more gracefull here?
        });
        conn.on("text", function(string) {
            var pieces = string.split(':');
            if(pieces[0] == 'S') {
                // Send speed to controller
                var speed = parseInt(pieces[1]);
                self.setSpeed(speed);
            }

            // Now check if we want to apply brakes
            if(pieces[0] == 'B') {
                if(pieces[1] == '1') {
                    console.log('Applying brakes');
                    self.setBrakes(true);
                    // Set motor speed to zero
                } else if(pieces[1] == '0') {
                    console.log('Requesting to release brakes');
                    // FUTURE add in checks to see if safe to release brakes
                    console.log('Releasing brakes');
                    self.setBrakes(false);
                } else {
                    // Unknown brake command
                    return;
                }
            }

            // Now check if we want to apply brakes
            if(pieces[0] == 'E') {
                self.estop('Operator triggered estop');
            }

            // Horn?
            if(pieces[0] == 'H') {
                rpio.write(33, rpio.HIGH);
                setTimeout(function() {
                    rpio.write(33, rpio.LOW);
                }, 1000);
            }

        });
    });
    this.wsServer.listen(controlServerPort, function onWsListen () {
        console.log('Control server started');
    });

    // Connect the two bogie motor controllers
    var c1Port = new SerialPort('/dev/ttyUSB0', {
        parser: serialPort.parsers.readline("\r"),
        baudrate: 115200
    }, false);
    this.controllers.push(new Controller(c1Port, 1, this.wsServer));
    var c2Port = new SerialPort('/dev/ttyUSB1', {
        parser: serialPort.parsers.readline("\r"),
        baudrate: 115200
    }, false);
    this.controllers.push(new Controller(c2Port, 2, this.wsServer));

    // Set to the safe state
    rpio.write(29, rpio.HIGH);

}

Locomotive.prototype.setBrakes = function(enabled) {
    if(enabled) {
        rpio.write(31, rpio.LOW);
        this.brakes = true;
        this.setSpeed(0);
    } else {
        rpio.write(31, rpio.HIGH);
        this.brakes = false;
    }
    //this.triggerPump();
}

// Hack to trigger the vacuum pump
Locomotive.prototype.triggerPump = function(time) {
    if(typeof time == undefined || time<0 || time > 100) {
        time == 10;
    }
    this.relay.write('c\n');
    clearInterval(this.pumpInterval);
    var self = this;
    var pumpOnTime = 10000;
    this.pumpInterval = setTimeout(function() {
        self.relay.write('d\n');
    }, pumpOnTime);

}

Locomotive.prototype.setSpeed = function(speed) {
    this.controllers.forEach(function sendSpeedToController(controller) {
        if(speed == 0 || !this.brakes) {
            controller.setSpeed(speed);
        }
    });
}

Locomotive.prototype.estop = function(reason) {
    this.setBrakes(true);
    this.controller.setSpeed(0);
    console.log('ESTOP triggered! Reason: '+reason);
}

// export the class
module.exports = Locomotive;
