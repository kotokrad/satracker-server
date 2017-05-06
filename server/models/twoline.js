const mongoose = require('../db/mongoose.js');
const axios = require('axios');
const log = require('../utils/log.js')(module);

const Schema = mongoose.Schema;

const TwoLineSchema = new Schema({
  satellite: {
    type: String,
    required: true,
  },
  lines: {
    type: Array,
    required: true,
    length: 2,
  },
});

TwoLineSchema.statics.update = function update() {
  const expression = /([A-Z 0-9]*)\s\[.*\n(^.*$)\n(^.*$)/gm;
  const url = 'http://www.celestrak.com/NORAD/elements/noaa.txt';
  return axios.get(url).then((res) => {
    const string = res.data.replace(/\r/gm, '');
    let lines;
    // eslint-disable-next-line
    while (lines = expression.exec(string)) {
      const satellite = lines[1].toLowerCase().replace(' ', '-');
      this.findOneAndUpdate({
        satellite: {
          $eq: satellite,
        },
      }, {
        satellite,
        lines: [lines[2], lines[3]],
      }, {
        upsert: true,
      }).then(() => {
        log.info(`[TLE update] ${satellite}`);
      });
    }
  }).catch((e) => {
    log.error(e);
  });
};

const TwoLine = mongoose.model('TwoLine', TwoLineSchema);

module.exports = TwoLine;
