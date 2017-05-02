const { satellite } = require('satellite.js');
const moment = require('moment');

function toShortDate(normalDate) {
  return Math.round(normalDate / 1000);
}

function toNormalDate(shortDate) {
  return new Date(shortDate * 1000);
}

function getPosition(lines, shortDate) {
  const date = toNormalDate(shortDate);
  const satrec = satellite.twoline2satrec(lines[0], lines[1]);
  const positionAndVelocity = satellite.propagate(satrec, date);
  const positionEci = positionAndVelocity.position;
  const gmst = satellite.gstimeFromDate(date);
  const positionGd = satellite.eciToGeodetic(positionEci, gmst);
  const longitude = positionGd.longitude;
  const latitude = positionGd.latitude;
  const height = positionGd.height;
  const longitudeStr = satellite.degreesLong(longitude);
  const latitudeStr = satellite.degreesLat(latitude);
  return {
    lat: parseFloat(latitudeStr.toFixed(5)),
    lng: parseFloat(longitudeStr.toFixed(5)),
    height: parseFloat(height.toFixed(2)),
    timestamp: toShortDate(date),
  };
}

const settings = {
  roughInterval: 10 * 60,     // seconds
  thoroughInterval: 15,       // seconds
  maxElevationThreshold: 20,  // radians
};

function getPass(lines, observer, momentDate) {
  const date = momentDate.toDate();
  const satrec = satellite.twoline2satrec(lines[0], lines[1]);
  const positionAndVelocity = satellite.propagate(satrec, date);
  const positionEci = positionAndVelocity.position;
  const gmst = satellite.gstimeFromDate(date);
  const positionEcf = satellite.eciToEcf(positionEci, gmst);
  const lookAngles = satellite.ecfToLookAngles(observer, positionEcf);
  const azimuth = lookAngles.azimuth;
  const elevation = lookAngles.elevation;
  return {
    elevation,
    azimuth,
    date,
  };
}

function nextPass(lines, observer, date, interval) {
  let currentDate = moment(date);
  const endDate = moment(date).add(1, 'd');
  let pass = {};
  while ((pass.elevation === undefined || pass.elevation < 0) && currentDate < endDate) {
    pass = getPass(lines, observer, currentDate);
    if (pass.elevation < 0) {
      currentDate = currentDate.add(interval, 's');
    }
  }
  if (pass.elevation > 0) {
    return pass;
  }
  return false;
}

function getPassList(lines, observerCoords, startDate, endDate) {
  const MAX_PASS_DURATION = 20 * 60; // 20 minutes
  const observer = {
    latitude: observerCoords.lat * satellite.constants.deg2rad,
    longitude: observerCoords.lng * satellite.constants.deg2rad,
    height: 0,
  };
  let currentDate = moment(startDate);
  // const maxElevationThreshold = settings.maxElevationThreshold * satellite.constants.deg2rad;

  const roughPasses = [];
  while (currentDate <= endDate) {
    const pass = nextPass(lines, observer, currentDate, settings.roughInterval);
    roughPasses.push(pass);
    currentDate = moment(pass.date).add(MAX_PASS_DURATION, 's');
  }
  const unfilteredPassList = roughPasses.map((roughPass) => {
    const localScanStartDate = moment(roughPass.date).subtract(settings.roughInterval, 's');
    const localFirstPass = nextPass(lines, observer, localScanStartDate, settings.thoroughInterval);
    const localStartDate = localFirstPass.date;
    const localEndDate = moment(localStartDate).add(1, 'h');
    const localPasses = [];
    let localCurrentDate = moment(localStartDate);
    let localCurrentPass = {};
    while (
      (localCurrentPass.elevation === undefined || localCurrentPass.elevation > 0)
      && localCurrentDate < localEndDate
    ) {
      localCurrentPass = getPass(lines, observer, localCurrentDate);
      localCurrentDate = moment(localCurrentDate).add(settings.thoroughInterval, 's');
      localPasses.push(localCurrentPass);
    }
    const localMaxElevation = localPasses.reduce((mel, current) => {
      const elevation = current.elevation > mel ? current.elevation : mel;
      return elevation;
    }, 0);
    return {
      start: localStartDate,
      mel: Math.round(localMaxElevation * satellite.constants.rad2deg),
    };
  });
  const passList = unfilteredPassList.filter(pass => pass.mel >= settings.maxElevationThreshold);
  return passList;
}

module.exports = {
  toShortDate,
  toNormalDate,
  getPosition,
  getPassList,
};
