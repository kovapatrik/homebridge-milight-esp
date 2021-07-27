const http = require("http");
const colorsys = require("colorsys");
const mqtt = require("mqtt");

let Service, Characteristic;

async function timeoutPromise(ms){
  return await new Promise(r => setTimeout(r, ms));
}

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerPlatform("milight-esp-hub", "MiLightEsp", MiLightPlatform);
}

function MiLightPlatform(log, config) {
  this.log = log;
  this.config = config;
  this.ip = config.ip;
  this.auth = 'Basic ' + Buffer.from(config.username + ':' + config.password).toString('base64');
  this._accessories = [];

  let self = this;
  if (config.mqtt.ip) {
    this.mqtt_client = mqtt.connect(config.mqtt.ip, {
      username: config.mqtt.username,
      password: config.mqtt.password,
      port:1883
    });

    self.mqtt_client.on('connect', function () {
      self.mqtt_client.subscribe('milight/updates/#', function (err) {
        if (!err) {
          console.log("MQTT connection succeed");
  
          self.mqtt_client.on('message', function (topic, message, etc) {
            //console.log(etc);
            if (!etc.retain && !etc.dup) {
              self.processMsg(message.toString(), topic.toString());
              //console.log(topic.toString() + message.toString());
              //console.log(etc);
            } else {
              console.log("Retain: " + message.toString());
            }
          });
  
        } else {
          console.log("MQTT connection failed.");
        }
      });
    });
  }

  
}


MiLightPlatform.prototype.accessories = function(callback) {
  let aliases = [];
  let groups = this.config.groups || [];
  for(const group of groups) {
    aliases.push(group.mainAlias);
    for(const alias of group.aliases){
      aliases.push(alias);
    }
  }
  //remove duplicates
  aliases = [...new Set(aliases)];

  for (const alias of aliases) {
    var bulb = new MiLightAccessory(alias, this);
    this._accessories.push(bulb);
  }

  callback(this._accessories);
}

MiLightPlatform.prototype.processMsg = function(msg, topic) {
  let changed = JSON.parse(msg);
  let splitted = topic.split("/");
  let group_id = Number(splitted[4]);
  //console.log("Changed: " + JSON.stringify(changed) + ", Group ID: " + group_id);
  let key = Object.keys(changed)[0];
  let in_bulbs;
  if (group_id == 0) {
    in_bulbs = this._accessories;
  } else {
    in_bulbs = [this._accessories[group_id]];
  }

  for (var l of in_bulbs) {
    switch (key) {
      case "state":
        l.lightbulbService.getCharacteristic(Characteristic.On).updateValue((changed[key] == 'ON' ? 1 : 0));
        break;
      case "brightness":
        l.lightbulbService.getCharacteristic(Characteristic.Brightness).updateValue(changed[key] / 2.55);
        break;
      case "hue":
        l.lightbulbService.getCharacteristic(Characteristic.Hue).updateValue(changed[key]);
        break;
      case "saturation":
        l.lightbulbService.getCharacteristic(Characteristic.Saturation).updateValue(changed[key]);
        break;
    }
  }
}

function MiLightAccessory(alias, platform) {
  this.name = alias;
  this.alias = alias;
  this.platform = platform;
}


MiLightAccessory.prototype.setPowerState = function(powerOn, callback) {
  if (powerOn) {
      var send = { state: "ON" };
  } else {
      var send = { state: "OFF" };
  }
  this.platform.mqtt_client.publish("milight/" + this.alias, JSON.stringify(send));
  this.platform.log(this.alias + " turned " + send.state + ".");

  callback(null);
};

MiLightAccessory.prototype.setBrightness = function(level, callback) {
  //TODO: implement night mode
  var send = { brightness: level*2.55 };
  this.platform.mqtt_client.publish("milight/" + this.alias, JSON.stringify(send));
  this.platform.log(this.alias + " brightness set to " + level + "%.");

  callback(null);
}

MiLightAccessory.prototype.setHue = function(value, callback) {
  var send = { hue: value };
  this.platform.mqtt_client.publish("milight/" + this.alias, JSON.stringify(send));
  this.platform.log(this.alias + " hue set to " + value + ".");

  callback(null);
}

MiLightAccessory.prototype.setSaturation = function(value, callback) {
  var send = { saturation: value };
  this.platform.mqtt_client.publish("milight/" + this.alias, JSON.stringify(send));
  this.platform.log(this.alias + " saturation set to " + value + ".");

  callback(null);
}


MiLightAccessory.prototype.getServices = function() {
  this.informationService = new Service.AccessoryInformation();

  this.informationService
    .setCharacteristic(Characteristic.Manufacturer, 'MiLight')
    .setCharacteristic(Characteristic.Model, 'MiLight')
    .setCharacteristic(Characteristic.SerialNumber, "420");

  this.lightbulbService = new Service.Lightbulb(this.name);

  this.lightbulbService
    .getCharacteristic(Characteristic.On)
    .on("set", this.setPowerState.bind(this));
  
  this.lightbulbService
    .addCharacteristic(Characteristic.Brightness)
    .on("set", this.setBrightness.bind(this));  
  
  this.lightbulbService
    .addCharacteristic(Characteristic.Hue)
    .on("set", this.setHue.bind(this));  

  this.lightbulbService
    .addCharacteristic(Characteristic.Saturation)
    .on("set", this.setSaturation.bind(this));

  return [this.informationService, this.lightbulbService];
}
/*
MiLightAccessory.prototype.setBrightness = function(level, callback) {
  if (level === 0) {
    this.log("[" + this.name + "] Setting brightness to 0 (off)");
    this.lightbulbService.setCharacteristic(Characteristic.On, false);
  } else if (level <= 5) {
    
    var send = {effect: "night_mode"};

    this.light.sendCommands(this.commands[this.type].off(this.zone));
    // Ensure we're pausing for 100ms between these commands as per the spec
    this.light.pause(100);
    this.light.sendCommands(this.commands[this.type].nightMode(this.zone));

    // Manually clear last bulb sent so that "on" is sent when we next interact with this bulb
    this.lastSent.bulb = null;

  } else {
    // Send on command to ensure we're addressing the right bulb
    this.lightbulbService.setCharacteristic(Characteristic.On, true);

    this.log("[" + this.name + "] Setting brightness to %s", level);

    // If bulb supports it, set the absolute brightness specified
    if (["rgb", "white"].indexOf(this.type) === -1) {
      if (this.version === "v6" && this.type !== "bridge") {
        this.light.sendCommands(this.commands[this.type].brightness(this.zone, level));
      } else {
        this.light.sendCommands(this.commands[this.type].brightness(level));
      }
    } else {
      // If this is an rgb or a white bulb, they only support brightness up and down.
      if (this.type === "white" && level === 100) {
        // But the white bulbs do have a "maximum brightness" command
        this.light.sendCommands(this.commands[this.type].maxBright(this.zone));
        this.brightness = 100;
      } else {
        // We're going to send the number of brightness up or down commands required to get to get from
        // the current value that HomeKit knows to the target value

        // Keeping track of the value separately from Homebridge so we know when to change across multiple small adjustments
        if (this.brightness === -1) this.brightness = this.lightbulbService.getCharacteristic(Characteristic.Brightness).value;
        var currentLevel = this.brightness;

        var targetDiff = level - currentLevel;
        var targetDirection = Math.sign(targetDiff);
        targetDiff = Math.max(0, (Math.round(Math.abs(targetDiff) / 10))); // There are 10 steps of brightness

        if (targetDirection === 0 || targetDirection === -0 || targetDiff === 0) {
          this.log("[" + this.name + "] Change not large enough to move to next step for bulb");
        } else {
          this.log.debug("[" + this.name + "] Setting brightness to internal value %d (%d steps away)", Math.round(currentLevel / 10), targetDiff);

          this.brightness = level;

          for (; targetDiff > 0; targetDiff--) {
            if (targetDirection === 1) {
              this.light.sendCommands(this.commands[this.type].brightUp(this.zone));
              this.log.debug("[" + this.name + "] Sending brightness up command");
            } else if (targetDirection === -1) {
              this.light.sendCommands(this.commands[this.type].brightDown(this.zone));
              this.log.debug("[" + this.name + "] Sending brightness down command");
            }
          }
        }
      }
    }
  }
  callback(null);
}; */