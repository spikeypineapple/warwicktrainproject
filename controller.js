var speedInterval = 50;

// Constructor
function Controller(port, bogie, ws) {
    this.bogie = bogie;
    this.faultFlags = null;
    this.statusFlags = null;
    this.connected = false;
    this.speedInterval = null; // Holds the interval function
    this.sp = null; // Hold the serial port
    this.dataLogIntervalFunc = null;
    this.dataLogInterval = 100;
    this.speedCommand = null;
    this.ws = ws;
    var self = this;
    this.connect(port).then(function(port) {
        // Setup the data logging
        self.startDataLogging2(port, self.bogie, self.ws);
        // Setup the speed commanding
        self.startSendingSpeed(port);
    });
}

Controller.prototype.log = function(message) {
    console.log('Cont #'+this.bogie+': '+message);
}

Controller.prototype.processData = function(data) {
    var self = this;

    if(data.charAt(0) == '-') {
        self.log('Invalid command/response');
        process.exit();
    }

    if(data.charAt(0) == '?') {
        return;
        // Just a echo
    }

    switch(data.charAt(0)) {
        case "T":
            var temps = data.substring(2, data.length).split(':');
            var internal = temps[0];
            var chan1 = temps[1];
            var chan2 = temps[2];
            //self.log('Int: '+internal+'C - Chan1: '+chan1+'C - Chan2: '+chan2+'C');
            var largest = Math.max(internal, chan1, chan2);
            this.ws.connections.forEach(function (conn) {
                conn.sendText('T:'+self.bogie+':'+largest);
            });
            break;
        case "V":
            var volts = data.substring(3, data.length).split(':');
            var batteryVoltage = volts[1]/10;
            //self.log('Bat: '+batteryVoltage+'V');
            this.ws.connections.forEach(function (conn) {
                conn.sendText('V:B:'+batteryVoltage);
            });
            break;
        case "B":
            var currents = data.substring(3, data.length).split(':');
            //self.log('Chan 1: '+currents[0]+'A Chan2: '+currents[1]+'A');
            this.ws.connections.forEach(function (conn) {
                conn.sendText('C:'+(((self.bogie-1)*2)+1)+':'+currents[0]/10);
                conn.sendText('C:'+(((self.bogie-1)*2)+2)+':'+currents[1]/10);
            });
            break;
    }

    // Check for fault faultFlags
    if(data.charAt(0) == 'F' && data.charAt(1) =='F') {
        // Update the fault flags
        var code = parseInt(data.substring(3, data.length));
        if(code != 0) {
            //self.log('FAULT! Code: '+code); // TODO set only on change
        }
        this.ws.connections.forEach(function (conn) {
            conn.sendText('F:'+self.bogie+':'+code);
        });
    }
}

Controller.prototype.startDataLogging2 = function(port, bogie) {
    // Set an event for on data
    this.dataLogIntervalFunc = setInterval(this.requestData, this.dataLogInterval, port);
    var self = this;
    // Attach the on data event handler
    port.on('data', function(data) {
        self.processData(data);
    });
}

Controller.prototype.requestData = function(port) {
    // Request all the data we need
    port.write('?V\r');
    port.write('?T\r');
    port.write('?BA\r');
    port.write('?FF\r');
}

Controller.prototype.setSpeed = function(speed) {
    if(speed <= 1000 && speed >= -1000) {
        this.speedCommand = speed;
    }
}

Controller.prototype.startSendingSpeed = function(port) {
    this.speedInterval = setInterval(this.sendSpeed, speedInterval, this, port);
}

Controller.prototype.sendSpeed = function(self, port) {
    if(self.speedCommand != null) {
        port.write('!G 1 '+self.speedCommand+'\r');
        port.write('!G 2 '+self.speedCommand+'\r');
    }
}

// Open the serial port for communication
Controller.prototype.connect = function(port) {
    this.log('Connecting...');
    var self = this;
    return new Promise(function(resolve, reject){
        port.open(function(error) {
            if (error) {
                self.log('Failed to connect: '+error);
                reject(error);
            } else {
                self.log('Connected');
                resolve(port);
            }
        });
    });
};

// export the class
module.exports = Controller;
