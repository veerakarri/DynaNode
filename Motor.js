/*	Motor.js - objects distributed by MotorSystem.js
 *	
 *	Events:
 *		- valueUpdated		{registerName,value}
 *		- frequencyUpdated	{registerName,frequency}
 *		- terminated	
 *
 *	Methods:
 *		- constructor				[motorID] [network] [regPairs]
 *		- getID						{id}
 *		- listRegisters				[[{name,value,frequency}...{}]]
 *		- getRegister				{decodedValue,rawValue,encoding,frequency}
 *		- setRegisterValue			[regName] [encodedValue]
 *		- setRegisterRefreshRate
 *		- getNetworkName			{comPortName}
 *		- terminate
 *	
 *	USAGE: 	Subscribe to event "valueUpdated" to receive motor updates
 *			Use setRegisterValue to write to motor registers 	
 *			
 *	NOTE:	Be sure to use encoded / decoded values where requested.
 */

var util = require("util");
var events = require("events");
var Encoding = require("./Encoding");

var MotorRegister = function(name,address,bytes,frequency,encoding) {
	var self = this;
	this.name = name;
	this.address = address;
	this.numberOfBytes = bytes;
	this.frequencyMS = frequency;
	this.encoding = encoding;
	this.value = null;
};


var Motor = function(motorID,network,regPairs) {
	var self = this;
	var motorID = motorID;
	var network = network;
	var registers = [];
	
	//Process regPairs
	for(var i=0; i<regPairs.length; i++) {
		var name = regPairs[i].name;
		var address = regPairs[i].address;
		var bytes = regPairs[i].bytes;
		var frequency = regPairs[i].frequency;
		var encoding = Encoding.GetEncoding(name);
		
		registers.push(new MotorRegister(name,address,bytes,frequency,encoding));
		
	}
	
	
	network.on("valueUpdated"+motorID,function(d){
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === d.name) {
				registers[i].value = d.value;
				self.emit("valueUpdated",{name:d.name,value:d.value});
				break;
			}
		}	
	});
	
	network.on("frequencyUpdated"+motorID,function(d){
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === d.name) {
				registers[i].frequencyMS = d.frequency;
				self.emit("frequencyUpdated",{name:d.name,frequency:d.frequency});
				break;
			}
		}	
	});
	
	network.on("terminated",function(d){
		self.emit("terminated",{});
		registers = [];
	});
	
	
	this.getID = function() {
		return motorID;
	};
	
	this.listRegisters = function() {
		var regs = [];
		for(var i=0; i<registers.length; i++) {
			regs.push({name:registers[i].name,value:registers[i].value,frequency:registers[i].frequencyMS});
		}
		return regs;
	};
	
	this.getRegister = function(regName) {
		//Retrieve from cache
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === regName) {
				var r = registers[i];
				var dv = Encoding.toNumber(registers[i].encoding,registers[i].value);
				return {decodedValue:dv,rawValue:r.value,encoding:r.encoding, frequency:r.frequencyMS};
			}
		}
		return {};
	};
	
	this.setRegisterValue = function(regName,value) {
		//Tell the network to update the register
		var address = null;
		var nb = 1;
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === regName) {
				address = registers[i].address;
				nb = registers[i].numberOfBytes;
				break;
			}
		}
		
		if(address !== null) {
			return network.setRegister(motorID,address,nb,value);
		} else {
			return false;
		}
	};
	
	this.setRegisterRefreshRate = function(regName,frequencyMS) {
		//Tell network to update refresh rate
		var address = null;
		var nb = 1;
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === regName) {
				address = registers[i].address;
				nb = registers[i].numberOfBytes;
				break;
			}
		}
		
		if(address !== null) {
			return network.setRefreshRate(motorID,address,frequencyMS);
		} else {
			return false;
		}
	};
	
	this.getNetworkName = function() {
		return network.getName();
	};
	
	this.terminate = function() {
		self.emit("terminated",{});
		registers = [];
	};
};

util.inherits(Motor,events.EventEmitter);
module.exports = Motor;