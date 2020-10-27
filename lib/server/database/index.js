const songlist = new Map()
let lastAddedSong

module.exports = (option) => {
  return {
    songlist,
    lastAddedSong,
    songlistAdd (song) {
      const uuid = song.uuid
      const result = songlist.set(uuid, song)
      lastAddedSong = song
      return result
    },
    songlistRemove ({ uuid }) {
      if (lastAddedSong.uuid === uuid) lastAddedSong = undefined
      return this.songlist.delete(uuid)
    },
    toPlayList () {
      const now = new Date()
      return Array.from(songlist)
        .filter(([uuid, song]) => {
          const duration = now - song.createdAt
          const durationDays = duration / 1000 / 60 / 60 / 24
          const shouldRemove = durationDays > removeAfterDays

          if (shouldRemove) songlist.delete(uuid)
          return !shouldRemove
        })
        .map(([uuid, result]) => result)
        .reverse()
    }
  }
}
