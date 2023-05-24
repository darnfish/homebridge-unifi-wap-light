# homebridge-unifi-wap-light
Control the light rings on your UniFi Wireless Access Point(s) with HomeKit!

## Installation
Search for `homebridge-unifi-wap-light`, or run:
```
yarn global add homebridge-unifi-wap-light
```

## Usage
Create a local UniFi OS user, take note of the username and password, and add the following to your `config.json`:
```
{
		"name": "UniFi WAP Lights",
		"platform": "UnifiWAPLight",
		"host": "<hostname>:<port>",
		"username": "<username>",
		"password": "<password>"
}
```

## License
MIT
