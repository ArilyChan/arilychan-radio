"use strict";

const { EventEmitter } = require("events");
const Arg = require("./lib/command/arg");
const server = require("./lib/server/server");

module.exports.name = 'arilychan-radio';
module.exports.webPath = 'radio';
module.exports.init = (options) => {
    const emitter = new EventEmitter()
    return {
        emitter,
        async search(msg) {
            let arg = new Arg(msg);
            let beatmapInfo = await arg.getBeatmapInfo();
            emitter.emit('search-result', beatmapInfo);
            return beatmapInfo;
        }
    }
}
module.exports.webView = (options, storage, http) => {
    return server(storage, http);
}
module.exports.apply = (ctx, options, storage) => {
    ctx.middleware(async (meta, next) => {
        try {
            const userId = meta.userId;
            const command = meta.message.trim().split(' ').filter(item => item !== '');
            if (command.length < 1) return next();
            if (command[0].substring(0, 1) !== '!' && command[0].substring(0, 1) !== '！') return next();
            if (command[0].length < 2) return next();
            const act = command[0].substring(1);
            if (act === '点歌') {
                try {
                    // TODO
                    let beatmapInfo = await storage.search(command[1]);
                    beatmapInfo.uploader = {
                        id: userId,
                        nickname: meta.sender.nickname
                    };
                    let reply = `[CQ:at,qq=${userId}]\n`;
                    reply += "搜索到曲目：" + beatmapInfo.artistU + " - " + beatmapInfo.titleU + "\n";
                    if (!beatmapInfo.audioFileName) reply += "小夜没给音频，只有试听\n";
                    reply += "点歌成功！歌曲将会在歌单保存 " + options.expire + " 天";
                    reply += "\n电台地址：" + options.web.host + options.web.path;
                    return meta.$send(reply);
                }
                catch (ex) {
                    return meta.$send(`[CQ:at,qq=${userId}]\n` + ex);
                }
            }
            return next();
        } catch (ex) {
            console.log(ex);
            return next();
        }
    })
}