"use strict";

const { EventEmitter } = require("events");
const Arg = require("./lib/command/arg");
const server = require("./lib/server/server");

module.exports.name = 'arilychan-radio';
module.exports.webPath = '/radio';
module.exports.init = (option = {}) => {
    const playlist = new Map()
    const emitter = new EventEmitter()
    const removeAfterDays = ((option.expire || 7) + 1)

    return {
        emitter,
        /**
         * 点歌
         * @param {String} msg “点歌”后面的参数
         * @returns {import("./lib/api/sayobot").BeatmapInfo} BeatmapInfo
         */
        async search(msg) {
            const arg = new Arg(msg);
            const beatmapInfo = await arg.getBeatmapInfo();
            playlist.set(beatmapInfo.sid, beatmapInfo)
            setTimeout(() => emitter.emit('search-result', beatmapInfo), 0) // give bot time to setup qq and name
            return beatmapInfo;
        },
        /**
         * 从playlist中删除指定歌曲
         * @param {Number} uuid 
         * @param {Number} qqId -1=可以删除任何人的歌曲，管理员限定
         */
        async delete(uuid, { id: qqId = -1, name }) {
            // let aim = Array.from(playlist).filter(([sid, song]) => {
            //     if (qqId === -1) return (song.uuid === uuid)
            //     else return (song.uuid === uuid && song.uploader.id === qqId)
            // });
            // if (aim.length <= 0) throw "找不到该曲目"
            // // aim.length should be 1
            // playlist.delete(aim.pop().sid)

            const [sid, target] = Array.from(playlist).find(([sid, song]) => song.uuid == uuid)

            if (!target) throw new Error('找不到曲目')
            if (qqId !== -1 && song.uploader.id !== qqId) throw new Error('你不能删这条点播')

            playlist.delete(sid)
            emitter.emit('remove-track', { uuid, uploader: { id: qqId, name } })
            return true
        },
        /**
         * 广播
         * @param {Number|String} name qqId或其他东西
         * @param {String} msg 
         */
        async broadcast(name, msg) {
            setTimeout(() => emitter.emit('broadcast-message', { name }, msg), 0)
        },
        playlist,
        filteredPlaylistArray() {
            const now = new Date()
            return Array.from(playlist)
                .filter(([sid, song]) => {
                    const duration = now - song.createdAt
                    const durationDays = duration / 1000 / 60 / 60 / 24
                    const shouldRemove = durationDays > removeAfterDays

                    if (shouldRemove) playlist.delete(sid)
                    return !shouldRemove
                })
                .map(([sid, result]) => result)
                .reverse()
        }
    }
}
module.exports.webView = server

let uuid = 0;
module.exports.apply = (ctx, options, storage) => {
    ctx.middleware(async (meta, next) => {
        try {
            const userId = meta.userId;
            const command = meta.message.trim().split(' ').filter(item => item !== '');
            if (command.length < 1) return next();
            if (command[0].substring(0, 1) !== '!' && command[0].substring(0, 1) !== '！') return next();
            if (command[0].length < 2) return next();
            const act = command[0].substring(1);
            switch (act) {
                case '点歌':
                case 'radio.queue':
                case 'radio.add':
                case 'queue.add':
                    try {
                        let beatmapInfo = await storage.search(command.slice(1).join(' '));
                        beatmapInfo.uploader = {
                            id: userId,
                            nickname: meta.sender.nickname
                        };
                        beatmapInfo.uuid = ++uuid;
                        let reply = `[CQ:at,qq=${userId}]\n`;
                        reply += "搜索到曲目：" + beatmapInfo.artistU + " - " + beatmapInfo.titleU + "\n";
                        if (!beatmapInfo.audioFileName) reply += "小夜没给音频，只有试听\n";
                        reply += "点歌成功！UUID：" + beatmapInfo.uuid + "，歌曲将会保存 " + options.expire + " 天";
                        reply += "\n电台地址：" + options.web.host + options.web.path;
                        return meta.$send(reply);
                    }
                    catch (ex) {
                        return meta.$send(`[CQ:at,qq=${userId}]\n` + ex);
                    }
                case '广播':
                case 'radio.broadcast':
                    try {
                        if (!options.isAdmin(meta)) return meta.$send(`[CQ:at,qq=${userId}]\n只有管理员才能发送广播消息`);
                        const msg = command.slice(1).join(' ');
                        await storage.broadcast(userId, msg);
                        return meta.$send(`[CQ:at,qq=${userId}]\n已发送广播`);
                    }
                    catch (ex) {
                        return meta.$send(`[CQ:at,qq=${userId}]\n` + ex);
                    }
                case '删歌':
                case 'radio.delete':
                case 'radio.remove':
                case 'radio.cancel':
                case 'queue.delete':
                case 'queue.remove':
                case 'queue.cancel':
                    try {
                        const arg = command.slice(1).join(' ');
                        if (!arg) return meta.$send(`[CQ:at,qq=${userId}]\n请指定UUID`);
                        const uuid = parseInt(arg);
                        if (!uuid) return meta.$send(`[CQ:at,qq=${userId}]\nUUID应该是个正整数`);
                        if (options.isAdmin(meta)) await storage.delete(uuid, { id: -1, nickname: meta.sender.nickname });
                        else await storage.delete(uuid, { id: userId, nickname: meta.sender.nickname });
                        return meta.$send(`[CQ:at,qq=${userId}]\n删除成功！`);
                    }
                    catch (ex) {
                        return meta.$send(`[CQ:at,qq=${userId}]\n` + ex.message);
                    }
                default: return next();

            }
        } catch (ex) {
            console.log(ex);
            return next();
        }
    })
}