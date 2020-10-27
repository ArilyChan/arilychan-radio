const database = require('./database')
const broadcast = require('./broadcast')

module.exports = (option) => {
    const removeAfterDays = ((option.expire || 7) + 1)

    return {
        songlist: database.songlist,
        playlist: database.songlist, // for compatibility
        emitter: broadcast.emitter,

        /**
         * 搜索歌曲
         * @param {String} msg “点歌”后面的参数
         * @returns {import("./lib/api/sayobot").BeatmapInfo} BeatmapInfo
         */
        async search(msg) {
            const arg = new Arg(msg);
            const beatmapInfo = await arg.getBeatmapInfo();
            return beatmapInfo;
        },

        /**
         * 检查歌曲是否在指定时间长度内
         * @param {import("./lib/api/sayobot").BeatmapInfo} beatmapInfo 
         * @param {Number} limit 秒数
         * @returns {Boolean} true为在limit内，option.durationLimit未定义则始终为true
         */
        withinDurationLimit(beatmapInfo, limit = option.durationLimit) {
            if (limit) {
                return (beatmapInfo.duration <= limit);
            }
            else return true;
        },

        /**
         * 点歌
         * @param {Object} song
         */
        async add(song) {
            database.songlistAdd(song)
            setTimeout(() => broadcast.broadcast('search-result', song), 0) // give bot time to setup qq and name
            return true;
        },
        /**
         * 从playlist中删除指定歌曲
         * @param {String} uuid 
         * @param {Object} uploader 
         * @param {Number} uploader.id 
         * @param {String} uploader.nickname
         */
        async delete(uuid, { id: qqId, nickname }) {
            database.songlistRemove({ uuid })
            broadcast.broadcast('remove-track', { uuid, uploader: { id: qqId, nickname } })
            return true
        },
        /**
         * 广播
         * @param {Number|String} name qqId或其他东西
         * @param {String} msg message to send
         */
        async broadcast(name, msg) {
            setTimeout(() => broadcast.broadcast('broadcast-message', { name }, msg), 0)
        },
        filteredPlaylistArray() {
              return database.toPlayList()
        }
    }
}