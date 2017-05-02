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
  Promise.all([
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
    if (lastPoint) {
      const lastDate = lastPoint.timestamp;
      trackDate = lastDate + 1;
    } else {
      trackDate = sat.toShortDate(moment(new Date()).subtract(1, 'h'));
    }
    const endDate = sat.toShortDate(moment(new Date()).add(1, 'h'));
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
  this.remove({
    timestamp: { $lt: obsoleteDate },
  }).then((data) => {
    log.info(`removed ${data.result.n} points`);
  });
};

PointSchema.statics.clear = function clear() {
  this.remove({}).then((data) => {
    log.info(`removed ${data.result.n} points`);
  });
};

const Point = mongoose.model('Point', PointSchema);

module.exports = Point;