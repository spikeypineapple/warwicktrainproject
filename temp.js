var ds18b20 = require('ds18b20');
ds18b20.sensors(function(err, ids) {
	console.log(ids);
});

// ... or sync call
console.log('Current temperature is' + ds18b20.temperatureSync('10-00080283a977'));
