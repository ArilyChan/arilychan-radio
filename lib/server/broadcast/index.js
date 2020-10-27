const EventEmitter = require("events");

const emitter = new EventEmitter()
module.exports = {
  emitter,
  broadcast(...args){
    this.emitter.emit(...args)
  }
}