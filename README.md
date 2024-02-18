# homebridge-unifi-wap-light
Control the light rings on your UniFi Wireless Access Point(s) with HomeKit!

## Installation
Search for `homebridge-unifi-wap-light`, or run:
```sh
yarn global add homebridge-unifi-wap-light
```

## Usage
Create a local UniFi OS user, take note of the username and password, and add the following to your `config.json`:
```json
{
  "name": "UniFi WAP Lights",
  "platform": "UnifiWAPLight",
  "host": "<hostname>:<port>",
  "username": "<username>",
  "password": "<password>"
}
```

You can also optionally provide a list of UniFi WAP identifiers to include / exclude.
```json
{
  ...,
  "password": "<password>",
  "includeIds": [...],
  "excludeIds": [...]
}
```

If `includeIds` is specified and has more than one entry, only the WAPs included in the list will be added and/or kept in HomeKit / Homebridge.

If `excludeIds` is specified, all listed WAPs won't be added and/or removed from HomeKit / Homebridge, even if included in `includeIds`.

## License
MIT
