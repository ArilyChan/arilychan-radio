"use strict";

const express = require('express');
const socketIO = require('socket.io')
const app = express();
// TODO
const router = express.Router();

const playlist = new Map()

router.get('/history',(req,res,next) => {
  const arrayLists = Array.from(playlist).map(([sid, result]) => result)
  res.json(arrayLists)
})

app.use(router)

module.exports = (storage, http) => {

  const { emitter } = storage

  emitter.on('search-result', result => {
    playlist.set(result.sid, result)
  })

  const io = socketIO(http, {
    path: '/Radio'
  })

  io.on('connection',(socket) => {
    const eventProxier = result => socket.emit('search-result', result)
    emitter.on('search-result', eventProxier)
    socket.on('disconnect', () => {
      emitter.off(eventProxier)
    });
  })

  return app
}