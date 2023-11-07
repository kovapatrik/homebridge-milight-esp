/* eslint-disable max-len */
import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { MiLightAccessory } from './platformAccessory';
import { connect, MqttClient } from 'mqtt';
import { Config, defaultConfig, defaultGroupConfig } from './utils';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class MiLightPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  public mqtt_client: MqttClient;
  private platformConfig: PlatformConfig & Config;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    // Apply default config
    this.platformConfig = {
      ...defaultConfig,
      ...config,
    };
    this.platformConfig.groups = this.platformConfig.groups.map(g => {
      return {
        ...defaultGroupConfig,
        ...g,
      };
    });

    this.log.debug('Finished initializing platform:', this.platformConfig.name);
    this.mqtt_client = {} as MqttClient;
    try {
      this.mqtt_client = connect(this.platformConfig.mqtt.ip, {
        username: this.platformConfig.mqtt.username,
        password: this.platformConfig.mqtt.password,
        port: this.platformConfig.mqtt.port,
      });
      this.mqtt_client.on('connect', () => {
        this.log.debug('MQTT connection succeed!');
        this.mqtt_client!.subscribe('milight/updates/#', (err) => {
          if (!err) {
            this.log.debug('MQTT subscription succeed!');
            this.mqtt_client!.on('message', (topic, message) => {
              this.synchronizeStatesMQTT(JSON.parse(message.toString()), topic);
            });
          } else {
            this.log.error('MQTT subscription failed.');
          }
        });
      });

      this.mqtt_client.on('error', (err) => {
        this.log.error('MQTT connection failed: ' + err.message);
      });
    } catch (err) {
      this.log.error('MQTT connection failed: ' + err);
      this.log.error('Plugin will not work without MQTT connection, terminating plugin...');
      return;
    }
    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.loadDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  loadDevices() {
    const accessoriesToRegister: PlatformAccessory[] = [];
    // loop over the discovered devices and register each one if it has not already been registered
    for (const group of this.platformConfig.groups) {
      const aliases = [group.name, ...group.aliases];
      for (const device of aliases) {
        const uuid = this.api.hap.uuid.generate(`${group.name}:${device}`);

        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
        // the accessory already exists
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

          new MiLightAccessory(this, existingAccessory, device, group.sync && device === group.name);

          this.accessories.push(existingAccessory);

        } else {
          this.log.info('Adding new accessory:', device);

          const accessory = new this.api.platformAccessory(device, uuid);

          new MiLightAccessory(this, accessory, device, group.sync && device === group.name);

          accessoriesToRegister.push(accessory);
          this.accessories.push(accessory);
        }
      }
    }

    if (accessoriesToRegister.length) {
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRegister);
    }
  }

  // Synchronize state updates coming from another remotes (ids defined in config)
  synchronizeStatesMQTT(message: object, topic: string) {
    const splitted = topic.split('/');
    const device_id = splitted[2];
    const group_id = Number(splitted[4]);
    const group = this.platformConfig.groups.find(g => g.ids_to_listen_on.includes(device_id));

    if (group) {
      const devices_to_update = group_id === 0 ? [group.name, ...group.aliases] : group.aliases.length > group_id-1 ? [group.aliases[group_id-1]] : [];
      if (devices_to_update.length > 0) {
        this.updateStates(group.name, devices_to_update, message);
      }
    }
  }

  // Synchronize group updates (if main group changes, all lights changes too)
  synchronizeGroup(name: string, state: object) {
    const group = this.platformConfig.groups.find(g => g.name === name);

    if (group) {
      const devices_to_update = group.aliases;
      this.updateStates(group.name, devices_to_update, state);
    }
  }

  updateStates(group_name: string, aliases: string[], state: object) {
    const changed_key = Object.keys(state)[0];
    this.log.debug('Sync ' + aliases.toString());
    for (const device of aliases) {
      const uuid = this.api.hap.uuid.generate(`${group_name}:${device}`);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        const current_service = existingAccessory.getService(this.Service.Lightbulb);
        switch(changed_key) {
          case 'state':
            current_service!.getCharacteristic(this.Characteristic.On).updateValue(state[changed_key] === 'ON' ? 1 : 0);
            existingAccessory.context.state = state[changed_key] === 'ON' ? 1 : 0;
            break;
          case 'brightness':
            current_service!.getCharacteristic(this.Characteristic.Brightness).updateValue(Math.round(state[changed_key] / 2.55));
            existingAccessory.context.brightness = Math.round(state[changed_key] / 2.55);
            break;
          case 'level':
            current_service!.getCharacteristic(this.Characteristic.Brightness).updateValue(state[changed_key]);
            existingAccessory.context.brightness = state[changed_key];
            break;
          case 'hue':
            current_service!.getCharacteristic(this.Characteristic.Hue).updateValue(state[changed_key]);
            existingAccessory.context.hue = state[changed_key];
            break;
          case 'saturation':
            current_service!.getCharacteristic(this.Characteristic.Saturation).updateValue(state[changed_key]);
            existingAccessory.context.saturation = state[changed_key];
            break;
          case 'color_temp':
            current_service!.getCharacteristic(this.Characteristic.ColorTemperature).updateValue(state[changed_key]);
            existingAccessory.context.color_temp = state[changed_key];
            break;
        }
      }
    }
  }

}