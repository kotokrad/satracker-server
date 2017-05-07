Back-end of Satellite Tracking service for NOAA weather satellites.

## Using

Application has a REST API with JSON response:

### `/passes`

Generates and returns [passlist](https://en.wikipedia.org/wiki/Pass_(spaceflight)) of selected satellite for user coordinates.

Query parameters:
* `satellite` (required) - name of the satellite
* `lat` and 'lng' - observer coordinates. If not passed, coordinates will be defined by request IP
* `days` - prediction length in days. Maximum and default is `10`

[DEMO](https://satracker.herokuapp.com/passes?satellite=noaa-19&lat=48.0225&lng=37.8143&days=3)

### `/track`

Returns list of points for next 6420 seconds (one turn about the Earth), each contains coordinates, height and timestamp

Query parameters:
* `satellite` (required) - name of the satellite

[DEMO](https://satracker.herokuapp.com/track?satellite=noaa-19)

## TODO

- [ ] Authentication
- [ ] Satellite pass notification
