import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge'

import { UnifiWAPLight } from './platform'
import { getAccessPoint } from './unifi'

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class UniFiWAP {
	accessPoint: any

	private service: Service

	constructor(
    private readonly platform: UnifiWAPLight,
    private readonly accessory: PlatformAccessory,
	) {
		// set accessory information
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.accessory.getService(this.platform.Service.AccessoryInformation)!
			.setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
			.setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
			.setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial')

		// get the LightBulb service if it exists, otherwise create a new LightBulb service
		// you can create multiple services for each accessory
		this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb)

		// set the service name, this is what is displayed as the default name on the Home app
		// in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
		this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName)

		// each service must implement at-minimum the "required characteristics" for the given service type
		// see https://developers.homebridge.io/#/service/Lightbulb

		// register handlers for the On/Off Characteristic
		this.service.getCharacteristic(this.platform.Characteristic.On)
			.onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
			.onGet(this.getOn.bind(this))               // GET - bind to the `getOn` method below
	}

	/**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
	async setOn(value: CharacteristicValue) {
		if(!this.platform.axios) {
			this.platform.log.error(`Failed to set state for ${this.platform.axios} — axios does not exist.`)
			return false
		}

		await this.platform.axios.put(`proxy/network/api/s/default/rest/device/${this.accessPoint._id}`, {
			led_override: value ? 'on' : 'off',
		})

		this.platform.log.debug(`Set ${this.accessPoint.name} ->`, value)
	}

	/**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
	async getOn(): Promise<CharacteristicValue> {
		if(!this.platform.axios) {
			this.platform.log.error(`Failed to fetch on state for ${this.platform.axios} — axios does not exist.`)
			return false
		}

		const accessPoint = await getAccessPoint(this.accessPoint._id, this.platform.axios)

		this.platform.log.debug(`Get ${this.accessPoint.name} ->`, accessPoint.led_override === 'on')

		return accessPoint.led_override === 'on'
	}
}
