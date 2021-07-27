This is a homebridge plugin for the [esp8266 milight hub](https://github.com/sidoh/esp8266_milight_hub).

# Features

There's already a few milight implementations for homebridge out there, but I decided to create a new one because existing plugins did not meet my requirements.

 - **Setting the brightness to 0 when turning off a light.** So that when you turn them on with a low brightness, the light's don't flash super bright for a brief moment.
 - **Support for color tempurature mode.** Rgbww milights have two modes, color tempurature or rgb. Unfurtunately HomeKit support for lights with these two modes is rather glitchy, so it's not possible to expose both rgb and kelvin properties to Homekit. This plugin exposes only an rgb property, but detects when you set a color that is close to the colors used in the tempurature circle in homekit and uses the color tempurature mode on the milights in this case. This way you can still make use of the white colors on your milights.
 - **Support for grouping lights.** It is possible to group lights in homekit. However, when you have a lot of lights in one group and you turn them all on, it will slowly turn each light on one by one. In this plugin it is possible to specify groups so you can turn all your lights on at once instantly.

# usage

```json
"platforms": [
    {
        "platform":"MiLightEsp",
        "name":"MiLightEsp",
        "ip": "192.168.1.9",
        "aliases": ["DiningTable", "deskLight"],
        "groups": [
            {
	            "mainAlias": "LivingRoom",
	            "aliases": ["LivingRoom1", "LivingRoom2", "LivingRoom3"]
            },{
	            "mainAlias": "Bedroom",
	            "aliases": ["Bedroom1", "Bedroom2"]
            }
        ]
    }
]
```

- **ip** (required): the network address for your esp hub.
- **aliases** (optional): A list of strings with the aliases that should be exposed to homebridge. You can set up these aliases in your MiLight hub web panel at the 'Device Name' section. These names may not contain spaces.
- **groups** (optional): a list of groups where the `mainAlias` will be used when lights have the same values. You should have this `mainAlias` setup in the MiLight web pannel correctly. It is possible to pair multiple device ids to a single light, as long as the device id is different, you can't pair multiple groups under a single device id I believe. So you can pair each light to an individual alias, and then pair all lights combined to a single alias as well.

# Support

I have tested this with rgbww lights, I don't have rgb or white lights so I was not able to implement support for these types of light.