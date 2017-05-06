const mongoose = require('../db/mongoose.js');
const schedule = require('node-schedule');
const log = require('../utils/log.js')(module);
const moment = require('moment');
const api = require('../api.js');

const Schema = mongoose.Schema;

const jobs = {};


const TaskSchema = new Schema({
  type: {
    type: String,
    required: true,
  },
  execDate: {
    type: Number,
    default: 0,
  },
  addDate: {
    type: Number,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  args: {
    type: Array,
    default: {},
  },
});

TaskSchema.statics.jobs = {
  TEST: 'TEST',
  TRACK: 'TRACK',
  TLE: 'TLE',
};

TaskSchema.statics.registerJob = function registerJob(type, func) {
  if (jobs[type]) {
    throw new Error('Job is already registered');
  }
  jobs[type] = func;
};

TaskSchema.statics.scheduleJob = function scheduleJob(type, rawSpec, ...args) {
  const spec = moment.isMoment(rawSpec) ? rawSpec.toDate() : rawSpec;
  const task = new this({
    type,
    args,
    execDate: spec instanceof Date ? spec.valueOf() : 0,
    addDate: moment().valueOf(),
  });
  task.save();
  schedule.scheduleJob(spec, () => task.run());
};

TaskSchema.statics.runExpired = function runExpired() {
  this.find({
    execDate: { $gt: 0, $lt: moment().valueOf() },
    completed: false,
  }).then(tasks => tasks.forEach(task => task.run()));
};

TaskSchema.statics.removeRepetitive = function runExpired() {
  this.remove({
    execDate: 0,
  }).then(({ result }) => {
    log.info(`Removed ${result.n} repetitive jobs`);
  }).catch((e) => {
    log.error(e.toString());
  });
};

TaskSchema.statics.removeObsolete = function runExpired() {
  this.remove({
    addDate: { $lt: moment().subtract(10, 'd').valueOf() },
    completed: true,
  }).then(({ result }) => {
    log.info(`Removed ${result.n} obsolete jobs`);
  }).catch((e) => {
    log.error(e.toString());
  });
};

TaskSchema.methods.run = function run() {
  log.info(`Job ${this.type} started`);
  jobs[this.type](...this.args);
  if (this.execDate) {
    this.completed = true;
  }
  this.save();
};

const Task = mongoose.model('Task', TaskSchema);

module.exports = Task;
