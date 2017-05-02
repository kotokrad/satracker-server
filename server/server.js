require('./config/config.js');

const port = process.env.PORT;

const url = require('url');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const log = require('./utils/log.js')(module);
const api = require('./api.js');

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
  console.log(url.parse(req.url).pathname);
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

app.listen(port, () => {
  log.info(`Server is up on port ${port}`);
});
