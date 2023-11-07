/* eslint-disable max-len */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { MiLightPlatform } from './platform';

export class MiLightAccessory {
  private service: Service;

  constructor(
    private readonly platform: MiLightPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly alias: string,
    private readonly sync: boolean,
  ) {

    // The REST API won't return the color/white mode settings if the current mode is white/color,
    // so I added default values to them.
    // They will be updated as soon as the lights go into color or white mode.
    this.accessory.context.state = false;
    this.accessory.context.brightness = 50;
    this.accessory.context.hue = 20;
    this.accessory.context.saturation = 100;
    this.accessory.context.color_temp = 157;
    this.accessory.context.sync = this.sync;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'MiLightESP')
      .setCharacteristic(this.platform.Characteristic.Model, 'Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `${this.alias}`);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.alias);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))
      .onGet(this.getBrightness.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Hue)
      .onSet(this.setHue.bind(this))
      .onGet(this.getHue.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Saturation)
      .onSet(this.setSaturation.bind(this))
      .onGet(this.getSaturation.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
      .onSet(this.setColorTemperature.bind(this))
      .onGet(this.getColorTemperature.bind(this))
      .setProps({
        minValue: 153,
        maxValue: 370,
      });
  }

  async setOn(value: CharacteristicValue) {
    value = value as boolean;
    const send = {state: value ? 'ON' : 'OFF'};
    this.platform.mqtt_client!.publish('milight/' + this.alias, JSON.stringify(send));
    this.platform.log.debug(this.alias + ' turned ' + send.state + '.');

    this.accessory.context.state = value;

    if (this.accessory.context.sync) {
      this.platform.synchronizeGroup(this.alias, send);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    return this.accessory.context.state;
  }

  async setBrightness(value: CharacteristicValue) {
    value = value as number;
    const send = { level: value };
    this.platform.mqtt_client!.publish('milight/' + this.alias, JSON.stringify(send));
    this.platform.log.debug(this.alias + ' brightness set to ' + value + '%.');

    this.accessory.context.brightness = value;

    if (this.accessory.context.sync) {
      this.platform.synchronizeGroup(this.alias, send);
    }
  }

  async getBrightness(): Promise<CharacteristicValue> {
    return this.accessory.context.brightness;
  }

  async setHue(value: CharacteristicValue) {
    value = value as number;
    const send = { hue: value };
    this.platform.mqtt_client.publish('milight/' + this.alias, JSON.stringify(send));
    this.platform.log.debug(this.alias + ' hue set to ' + value + '.');

    this.accessory.context.hue = value;

    if (this.accessory.context.sync) {
      this.platform.synchronizeGroup(this.alias, send);
    }
  }

  async getHue(): Promise<CharacteristicValue> {
    return this.accessory.context.hue;
  }

  async setSaturation(value: CharacteristicValue) {
    value = value as number;
    const send = { saturation: value };
    this.platform.mqtt_client.publish('milight/' + this.alias, JSON.stringify(send));
    this.platform.log.debug(this.alias + ' saturation set to ' + value + '.');

    this.accessory.context.saturation = value;

    if (this.accessory.context.sync) {
      this.platform.synchronizeGroup(this.alias, send);
    }
  }

  async getSaturation(): Promise<CharacteristicValue> {
    return this.accessory.context.saturation;
  }

  async setColorTemperature(value: CharacteristicValue) {
    value = value as number;
    const send = { color_temp: value };
    this.platform.mqtt_client.publish('milight/' + this.alias, JSON.stringify(send));
    this.platform.log.debug(this.alias + ' color temperature set to ' + value + '.');

    this.accessory.context.color_temp = value;

    if (this.accessory.context.sync) {
      this.platform.synchronizeGroup(this.alias, send);
    }
  }


  async getColorTemperature(): Promise<CharacteristicValue> {
    return this.accessory.context.color_temp;
  }

}
