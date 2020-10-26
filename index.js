"use strict";

const { EventEmitter } = require("events");
const Arg = require("./lib/command/arg");
const server = require("./lib/server/server");
const utils = require("./lib/utils");
const { v4: uuidv4 } = require("uuid");

const defaultOptions = {
    duration: 60 * 10 + 1,
    expre: 7
}

module.exports.name = 'arilychan-radio';
module.exports.webPath = '/radio';
module.exports.init = (option = defaultOptions) => {
    const playlist = new Map()
    const emitter = new EventEmitter()
    const removeAfterDays = ((option.expire || 7) + 1)

    return {
        emitter,
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
            playlist.set(song.uuid, song)
            setTimeout(() => emitter.emit('search-result', song), 0) // give bot time to setup qq and name
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
            playlist.delete(uuid)
            emitter.emit('remove-track', { uuid, uploader: { id: qqId, nickname } })
            return true
        },
        /**
         * 广播
         * @param {Number|String} name qqId或其他东西
         * @param {String} msg message to send
         */
        async broadcast(name, msg) {
            setTimeout(() => emitter.emit('broadcast-message', { name }, msg), 0)
        },
        playlist,
        filteredPlaylistArray() {
            const now = new Date()
            return Array.from(playlist)
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
}
module.exports.webView = (option = defaultOptions, storage, http) => server(option, storage, http)

module.exports.apply = (ctx, options = defaultOptions, storage) => {
    ctx.middleware(async (meta, next) => {
        try {
            const userId = meta.userId;
            const command = meta.message.trim().split(' ').filter(item => item !== '');
            if (command.length < 1) return next();
            if (command[0].substring(0, 1) !== '!' && command[0].substring(0, 1) !== '！') return next();
            if (command[0].length < 2) return next();
            const act = command[0].substring(1);
            const argString = (command.length > 1) ? utils.unescapeSpecialChars(command.slice(1).join(' ')) : '';
            switch (act) {
                case '点歌':
                case 'radio.queue':
                case 'radio.add':
                case 'queue.add':
                    try {
                        let beatmapInfo = await storage.search(argString);
                        beatmapInfo.uploader = {
                            id: userId,
                            nickname: meta.sender.nickname
                        };
                        beatmapInfo.uuid = uuidv4();
                        let reply = `[CQ:at,qq=${userId}]\n`;
                        reply += "搜索到曲目：" + beatmapInfo.artistU + " - " + beatmapInfo.titleU + "\n";
                        // 如果超出时长，则拒绝添加
                        if (!storage.withinDurationLimit(beatmapInfo)) return await meta.$send(reply + "这首歌太长了，请选择短一些的曲目");
                        if (!beatmapInfo.audioFileName) reply += "小夜没给音频，只有试听\n";
                        // 查重
                        let p = aArray.from(storage.playlist).filter(async ([uuid, song]) => (song.sid == beatmapInfo.sid));
                        if (p.length > 0) {
                            p = p.filter(([uuid, song]) => (userId === song.uploader.id));
                            if (p.length > 0) {
                                // 当点的歌之前点过，而且是同一个人点，则删除旧的再添加新的
                                // @arily 建议一小时之内点过的拒绝再次点歌。一小时以上的直接插入就可以。历史会按照sid去重
                                await Promise.all(p.map(([uuid, song]) => {
                                    storage.delete(song.uuid, { id: userId, nickname: meta.sender.nickname })
                                }))
                                reply += "这首歌之前已经被你点过了，";
                            }
                            // 当点的歌之前点过，但不是同一个人点，则直接添加，重复歌曲由客户端去filter 
                            // @arily 前端不负责这些逻辑
                            reply += "这首歌之前已经被其他人点过了，";
                        }
                        await storage.add(beatmapInfo);
                        reply += "点歌成功！sid：" + beatmapInfo.sid + "，歌曲将会保存 " + options.expire + " 天";
                        reply += "\n电台地址：" + options.web.host + options.web.path;
                        return await meta.$send(reply);
                    }
                    catch (ex) {
                        return await meta.$send(`[CQ:at,qq=${userId}]\n` + ex);
                    }
                case '广播':
                case 'radio.broadcast':
                    try {
                        if (!options.isAdmin(meta)) return await meta.$send(`[CQ:at,qq=${userId}]\n只有管理员才能发送广播消息`);
                        await storage.broadcast(userId, argString);
                        return await meta.$send(`[CQ:at,qq=${userId}]\n已发送广播`);
                    }
                    catch (ex) {
                        return await meta.$send(`[CQ:at,qq=${userId}]\n` + ex);
                    }
                case '删歌':
                case 'radio.delete':
                case 'radio.remove':
                case 'radio.cancel':
                case 'queue.delete':
                case 'queue.remove':
                case 'queue.cancel':
                    try {
                        if (!argString) return await meta.$send(`[CQ:at,qq=${userId}]\n请指定sid`);
                        const sid = parseInt(argString);
                        if (!sid) return await meta.$send(`[CQ:at,qq=${userId}]\nsid应该是个正整数`);
                        let p = Array.from(storage.playlist).filter(([uuid, song]) => (song.sid == sid));
                        if (p.length <= 0) throw new Error('播放列表中没有该曲目');
                        if (options.isAdmin(meta)) {
                            // 管理员直接删除所有该sid曲目
                            await Promise.all(p.map( ([uuid, song]) => {
                                storage.delete(song.uuid, { id: userId, nickname: meta.sender.nickname })
                            }))
                        }
                        else {
                            // 删除自己上传的所有该sid曲目
                            p = p.filter(([uuid, song]) => (userId === song.uploader.id));
                            if (p.length <= 0) throw new Error('非上传者无法删除该曲目');
                            await Promise.all(p.map(([uuid, song]) => {
                                storage.delete(song.uuid, { id: userId, nickname: meta.sender.nickname })
                            }))
                        }
                        return await meta.$send(`[CQ:at,qq=${userId}]\n删除成功！`);
                    }
                    catch (ex) {
                        return await meta.$send(`[CQ:at,qq=${userId}]\n` + ex.message);
                    }
                default: return next();

            }
        } catch (ex) {
            console.log(ex);
            return next();
        }
    })
}