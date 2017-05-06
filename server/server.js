require('./config/config.js');

const port = process.env.PORT;

const url = require('url');
const path = require('path');
const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser');
const log = require('./utils/log.js')(module);
const api = require('./api.js');

const task = require('./models/task.js');
const point = require('./models/point.js');
const twoline = require('./models/twoline.js');

const satelliteList = ['noaa-18', 'noaa-19'];

const startupTasks = Promise.all([
  task.removeObsolete(),
  task.removeRepetitive(),
]).then(() => Promise.all([
  task.registerJob(task.jobs.TEST, (...args) => {
    const appearDate = moment().format('DD/MM/YY HH:mm:ss');
    log.info(`${appearDate}: test job started. Args: ${args}`);
  }),
  task.registerJob(task.jobs.CLEANUP, () => point.cleanup()),
  task.registerJob(task.jobs.TLE, () => twoline.update()),
  task.registerJob(task.jobs.TRACK, satellite => point.generate(satellite)),
])).then(() => Promise.all([
  task.scheduleJob(task.jobs.CLEANUP, '30 * * * *'),
  task.scheduleJob(task.jobs.TLE, { dayOfWeek: 0 }),
  new Promise((resolve, reject) => {
    try {
      satelliteList.forEach(satellite =>
      setTimeout(() => task.scheduleJob(task.jobs.TRACK, '*/30 * * * *', satellite)), 60000);
      resolve();
    } catch (e) {
      reject(e);
    }
  }),
])).then(() => task.run('CLEANUP'))
  .then(() => twoline.update())
  .then(() => task.run('TRACK'))
  .catch(e => log.error(e));


const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use(express.static(path.join(__dirname, 'public)')));
app.use((req, res, next) => {
  log.info(`${req.method} ${req.url}`);
  next();
});
app.use((req, res, next) => {
  const pathname = url.parse(req.url).pathname;
  const endpoints = ['/track', '/passes'];
  if (endpoints.includes(pathname) && !req.query.satellite) {
    log.info('No satellite passed');
    res.status(500);
    res.send();
  } else {
    next();
  }
});

app.get('/track', (req, res) => {
  api.getTrack(req.query.satellite).then((track) => {
    res.send(track);
  }).catch((e) => {
    log.error(e.toString());
  });
});

app.get('/passes', (req, res) => {
  log.info(req.query);
  api.getPassList(req).then((passList) => {
    res.send(passList);
  }).catch((e) => {
    log.error(e.toString());
  });
});

startupTasks.then(() => {
  app.listen(port, () => {
    log.info(`Server is up on port ${port}`);
  });
});
