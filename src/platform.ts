import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge'

import Axios, { AxiosInstance } from 'axios'

import jwt from 'jsonwebtoken'
import https from 'https'
import cookie from 'cookie'

import { UniFiWAP } from './platformAccessory'
import { getAccessPoints } from './unifi'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings'

interface UnifiWAPLightConfig extends PlatformConfig {
	host: string // "<hostname>:<port>",
	username: string // "<username>",
	password: string // "<password>"
	includeIds?: string[]
	excludeIds?: string[]
}

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class UnifiWAPLight implements DynamicPlatformPlugin {
	public readonly Service: typeof Service = this.api.hap.Service
	public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic

	// this is used to track restored cached accessories
	public readonly accessories: PlatformAccessory[] = []

	axios?: AxiosInstance
	authAxios?: AxiosInstance

	constructor(
		public readonly log: Logger,
		public readonly config: PlatformConfig,
		public readonly api: API,
	) {
		this.log.debug('Finished initializing platform:', (this.config as UnifiWAPLightConfig).name)

		// When this event is fired it means Homebridge has restored all cached accessories from disk.
		// Dynamic Platform plugins should only register new accessories after this event was fired,
		// in order to ensure they weren't added to homebridge already. This event can also be used
		// to start discovery of new accessories.
		this.api.on('didFinishLaunching', () => {
			log.debug('Executed didFinishLaunching callback')
			// run the method to discover / register your devices as accessories
			this.discoverDevices()
		})
	}

	/**
	 * This function is invoked when homebridge restores cached accessories from disk at startup.
	 * It should be used to setup event handlers for characteristics and update respective values.
	 */
	configureAccessory(accessory: PlatformAccessory) {
		this.log.info('Loading accessory from cache:', accessory.displayName)

		// add the restored accessory to the accessories cache so we can track if it has already been registered
		this.accessories.push(accessory)
	}

	async auth() {
		this.authAxios = Axios.create({
			baseURL: `https://${(this.config as UnifiWAPLightConfig).host}/api`,
			httpsAgent: new https.Agent({
				rejectUnauthorized: false,
			}),
		})

		const { headers } = await this.authAxios.post('/auth/login', {
			username: (this.config as UnifiWAPLightConfig).username,
			password: (this.config as UnifiWAPLightConfig).password,
			rememberMe: true,
		})

		if(!headers['set-cookie']) {
			return
		}

		const { TOKEN: token } = cookie.parse(headers['set-cookie'].join(';'))

		const { csrfToken } = jwt.decode(token)

		this.axios = Axios.create({
			baseURL: `https://${(this.config as UnifiWAPLightConfig).host}`,
			headers: {
				'Cookie': cookie.serialize('TOKEN', token),
				'X-Csrf-Token': csrfToken,
			},
			httpsAgent: new https.Agent({
				rejectUnauthorized: false,
			}),
		})
	}

	/**
	 * This is an example method showing how to register discovered accessories.
	 * Accessories must only be registered once, previously created accessories
	 * must not be registered again to prevent "duplicate UUID" errors.
	 */
	async discoverDevices() {
		await this.auth()

		if(!this.axios) {
			this.log.warn('Auth failed')
			return
		}

		let accessPoints = await getAccessPoints(this.axios)

		if(((this.config as UnifiWAPLightConfig).includeIds?.length || 0) > 0)
			accessPoints = accessPoints.filter(accessPoint => (this.config as UnifiWAPLightConfig).includeIds?.includes(accessPoint._id))

		if(((this.config as UnifiWAPLightConfig).excludeIds?.length || 0) > 0)
			accessPoints = accessPoints.filter(accessPoint => !(this.config as UnifiWAPLightConfig).excludeIds?.includes(accessPoint._id))

		// loop over the discovered devices and register each one if it has not already been registered
		for (const accessPoint of accessPoints) {

			// generate a unique id for the accessory this should be generated from
			// something globally unique, but constant, for example, the device serial
			// number or MAC address
			const uuid = this.api.hap.uuid.generate(accessPoint._id)

			const doesIncludeIdsExist = ((this.config as UnifiWAPLightConfig).includeIds?.length || 0) > 0
			const doesAccessPointExistInIncludeIds = (this.config as UnifiWAPLightConfig).includeIds?.includes(accessPoint._id)
			const doesAccessPointExistInExcludeIds = (this.config as UnifiWAPLightConfig).excludeIds?.includes(accessPoint._id)
			const include = (doesIncludeIdsExist ? doesAccessPointExistInIncludeIds : true) && !doesAccessPointExistInExcludeIds

			// see if an accessory with the same uuid has already been registered and restored from
			// the cached devices we stored in the `configureAccessory` method above
			const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid)

			if (existingAccessory) {
				// it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
				// remove platform accessories when no longer present
				if(!include) {
					this.log.info(`Removing existing accessory from cache, since it is present in excludeIds or not present in includeIds: ${existingAccessory.displayName} (${accessPoint._id})`)

					this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory])

					continue
				}

				// the accessory already exists
				this.log.info(`Restoring existing accessory from cache: ${existingAccessory.displayName} (${accessPoint._id})`)

				// if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
				// existingAccessory.context.device = device;
				// this.api.updatePlatformAccessories([existingAccessory]);

				// create the accessory handler for the restored accessory
				// this is imported from `platformAccessory.ts`
				new UniFiWAP(this, existingAccessory)

				continue
			}

			if(!include) {
				this.log.info(`Found new accessory, but not adding due to its presence in excludeIds or absence in includeIds: ${accessPoint.name} (${accessPoint._id})`)

				continue
			}

			// the accessory does not yet exist, so we need to create it
			this.log.info(`Adding new accessory: ${accessPoint.name} (${accessPoint._id})`)

			// create a new accessory
			const accessory = new this.api.platformAccessory(accessPoint.name, uuid)

			// store a copy of the device object in the `accessory.context`
			// the `context` property can be used to store any data about the accessory you may need
			accessory.context.accessPoint = accessPoint

			// create the accessory handler for the newly create accessory
			// this is imported from `platformAccessory.ts`
			new UniFiWAP(this, accessory)

			// link the accessory to your platform
			this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
		}
	}
}
