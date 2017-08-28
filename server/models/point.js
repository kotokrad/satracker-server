const moment = require('moment');
const mongoose = require('../db/mongoose.js');
const sat = require('../utils/sat.js');
const log = require('../utils/log.js')(module);

const TwoLine = require('./twoline.js');

const Schema = mongoose.Schema;

const PointSchema = new Schema({
  satellite: {
    type: String,
    required: true,
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Number,
    required: true,
  },
});

PointSchema.statics.generate = function generate(satellite) {
  // eslint-disable-next-line
  console.time(`[${satellite}] point.generate`);
  let trackDate;
  return Promise.all([
    TwoLine.findOne({
      satellite: { $eq: satellite },
    }),
    this.findOne({
      satellite: { $eq: satellite },
    }, null, {
      sort: { timestamp: -1 },
    }),
  ]).then((results) => {
    const twoline = results[0];
    const lastPoint = results[1];
    const limitDate = sat.toShortDate(moment(new Date()).subtract(30, 'm'));
    if (lastPoint && lastPoint.timestamp >= limitDate) {
      trackDate = lastPoint.timestamp + 1;
    } else {
      trackDate = limitDate;
    }
    const endDate = sat.toShortDate(moment(new Date()).add(30, 'm'));
    log.info(`[${satellite}] generating ${endDate - trackDate} points`);
    const data = [];
    while (trackDate < endDate) {
      const position = sat.getPosition(twoline.lines, trackDate);
      const { lat, lng, height, timestamp } = position;
      data.push({
        satellite,
        lat,
        lng,
        height,
        timestamp,
      });
      trackDate += 1;
    }
    this.insertMany(data).then(() => {
      // eslint-disable-next-line
      console.timeEnd(`[${satellite}] point.generate`);
    });
  });
};

PointSchema.statics.cleanup = function cleanup() {
  const obsoleteDate = sat.toShortDate(moment(new Date()).subtract(3, 'h'));
  return this.remove({
    timestamp: { $lt: obsoleteDate },
  }).then((data) => {
    log.info(`Removed ${data.result.n} obsolete points`);
  });
};

PointSchema.statics.clear = function clear() {
  return this.remove({}).then((data) => {
    log.info(`removed ${data.result.n} points`);
  });
};

const Point = mongoose.model('Point', PointSchema);

module.exports = Point;
