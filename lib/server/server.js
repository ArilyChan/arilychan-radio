"use strict";

const path = require('path')
const express = require('express');
const socketIO = require('socket.io')
const app = express();
// TODO
const router = express.Router();
const publicDir = path.join(__dirname, '../../public')

router.get('/', (req,res,next) => {
  // res.sendFile(path.join(publicDir, 'index.html'))
  res.redirect('./index.html')
})
router.get('*', express.static(publicDir))

app.use(router)

module.exports = (option, storage, http) => {

  router.get('/history',(req,res,next) => {
    res.json(storage.filteredPlaylistArray())
  })

  const { emitter } = storage

  const io = socketIO(http, {
    path: '/Radio'
  })

  io.on('connection',(socket) => {
    const eventProxier = result => socket.emit('search-result', result)
    emitter.on('search-result', eventProxier)
    socket.on('disconnect', () => {
      emitter.off('search-result', eventProxier)
    });
  })

  return app
}