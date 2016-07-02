var Controller = require('./controller.js');

var serialPort = require("serialport");
var SerialPort = serialPort.SerialPort; // localize object constructor

function Locomotive(){

    // Stores the inteveral counter for the vac pump
    this.pumpInterval = null;
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

            // Vac Pump
            if(pieces[0] == 'P') {
                console.log('Enabling 10sec vac pump');
                self.triggerPump();
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

}

Locomotive.prototype.setBrakes = function(enabled) {
    if(enabled) {
        this.relay.write('b\n');
        this.brakes = true;
        this.setSpeed(0);
    } else {
        this.relay.write('a\n');
        this.brakes = false;
    }
    this.triggerPump();
}

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
