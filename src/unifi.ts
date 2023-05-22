import { Axios } from 'axios'

export async function getAccessPoint(id: string, axios: Axios) {
	const accessPoints = await getAccessPoints(axios)

	return accessPoints.find(ap => ap._id === id)
}

export async function getAccessPoints(axios: Axios) {
	const { data: { network_devices: devices } } = await axios.get('proxy/network/api/s/default/stat/device')

	const accessPoints = devices.filter(device => device.is_access_point === true)

	return accessPoints
}
