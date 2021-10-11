A Homebridge plugin for the [ESP8266 MiLight Hub](https://github.com/sidoh/esp8266_milight_hub).

# Features

### State update via MQTT (optional)
 - If you use any remote to control your lights, the plugin can update those values also for the Homebridge.
 - You can host an MQTT server on your Raspberry Pi too, so this is easy to setup.
### Groups
 - You can create groups, which will be a switch in your Home app too. If you toggle that, it will toggle all of the contained lights also.

# Usage

```json
"platforms": [
	{
	    "platform": "MiLightEsp",
	    "name": "MiLight",
	    "ip": <ESP_HUB_IP>,
	    "username": <ESP_HUB_USERNAME>,
	    "password": <ESP_HUB_PASSWORD>,
	    "mqtt": {
		"ip": <MQTT_IP>,
		"username": <MQTT_USERNAME>,
		"password": <MQTT_PASSWORD>
	    },
	    "groups": [
		{
		    "mainAlias": <NAME_OF_THE_GROUP>,
		    "aliases": [
			<NAME_OF_LIGHT1>,
			<NAME_OF_LIGHT2>,
			...
		    ]
		}
	    ]
	}
]
```
