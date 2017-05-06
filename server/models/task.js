const mongoose = require('../db/mongoose.js');
const schedule = require('node-schedule');
const log = require('../utils/log.js')(module);
const moment = require('moment');

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
  CLEANUP: 'CLEANUP',
};

TaskSchema.statics.registerJob = function registerJob(type, func) {
  if (jobs[type]) {
    throw new Error('Job is already registered');
  }
  jobs[type] = func;
};

TaskSchema.statics.scheduleJob = function scheduleJob(type, rawSpec, ...args) {
  const spec = moment.isMoment(rawSpec) ? rawSpec.toDate() : rawSpec;
  return new Promise((resolve, reject) => {
    const task = new this({
      type,
      args,
      execDate: spec instanceof Date ? spec.valueOf() : 0,
      addDate: moment().valueOf(),
    });
    task.save()
      .then(() => {
        try {
          schedule.scheduleJob(spec, () => task.run());
          resolve();
        } catch (e) {
          reject(e);
        }
      })
      .catch(e => log.error(e));
  });
};

TaskSchema.statics.runExpired = function runExpired() {
  return this.find({
    execDate: { $gt: 0, $lt: moment().valueOf() },
    completed: false,
  }).then(tasks => tasks.forEach(task => task.run()))
    .catch(e => log.error(e));
};

TaskSchema.statics.removeRepetitive = function runExpired() {
  return this.remove({
    execDate: 0,
  }).then(({ result }) => {
    log.info(`Removed ${result.n} repetitive tasks`);
  }).catch((e) => {
    log.error(e);
  });
};

TaskSchema.statics.removeObsolete = function runExpired() {
  return this.remove({
    addDate: { $lt: moment().subtract(10, 'd').valueOf() },
    completed: true,
  }).then(({ result }) => {
    log.info(`Removed ${result.n} obsolete tasks`);
  }).catch((e) => {
    log.error(e);
  });
};

TaskSchema.statics.run = function staticRun(type) {
  return this.find({ type }).then(tasks => tasks.map(task => task.run()));
};

TaskSchema.methods.run = function methodRun() {
  log.info(`Job ${this.type} started`);
  const result = jobs[this.type](...this.args);
  if (this.execDate) {
    this.completed = true;
    this.save();
  }
  return result;
};

const Task = mongoose.model('Task', TaskSchema);

module.exports = Task;
