// const EventEmitter = require("events");

const songlist = new Map()
// const emitter = new EventEmitter()
module.exports = {
  songlist,
  // emitter,
  lastPushedSong() {

  },
  emitterPush(song) {

  },
  songlistAdd(song) {
    const uuid = song.uuid
  },
  songlistRemove({ uuid }) {

  },
  toPlayList(){
    const now = new Date()
    return Array.from(songlist)
      .filter(([uuid, song]) => {
          const duration = now - song.createdAt
          const durationDays = duration / 1000 / 60 / 60 / 24
          const shouldRemove = durationDays > removeAfterDays

          if (shouldRemove) playlist.delete(uuid)
          return !shouldRemove
      })
      .map(([uuid, result]) => result)
      .reverse()
  }
}