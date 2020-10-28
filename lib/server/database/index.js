// const songlist = new Map()
const { MongoClient } = require('mongodb')
const aggeregations = require('aggeregations')

let lastAddedSong

module.exports = async (option = { db: {} }) => {
  const uri = option.db.url || process.env.DB_URI || 'mongodb://localhost:27017/ArilyChan'
  const dbName = option.db.database || process.env.DB_DATABASE || 'ArilyChan'
  const removeAfterDays = (option.expire || 7) + 1

  const client = new MongoClient(uri)
  await client.connect()

  const database = client.db(dbName)
  const collection = database.collection('radio-requests')

  return {
    collection,
    // songlist,
    lastAddedSong,
    async songlistAdd (song) {
      // const uuid = song.uuid
      // const result = songlist.set(uuid, song)
      const result = await collection.insertOne(song)
      lastAddedSong = song
      return result
    },
    async songlistRemove ({ uuid }) {
      const result = collection.findOne({ uuid })
      if (lastAddedSong.uuid === result.uuid) lastAddedSong = undefined
      return collection.deleteOne({ uuid: result.uuid })
    },
    async toPlaylist () {
      const d = new Date()
      d.setDate(d.getDate() - removeAfterDays)
      return collection.aggregate([
        ...aggeregations.newerThan(d),
        ...aggeregations.sortByInsertionOrderDesc(),
        ...aggeregations.playlistUniqueBySid()
      ])
    }
  }
}
