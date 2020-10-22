"use strict";

const querystring = require('querystring');
const fetch = require('node-fetch');

class BeatmapInfo {
    constructor(data) {
        this.artist = data.artist;
        this.artistU = (data.artistU) ? data.artistU : data.artist;
        this.title = data.title;
        this.titleU = (data.titleU) ? data.titleU : data.title;
        this.sid = data.sid;
        this.creator = data.creator;
        this.creator_id = data.creator_id;
        this.source = data.source;
        this.beatmap = data.bid_data.pop();
        this.audioFileName = this.beatmap.audio; // 无音频则为""
        this.bgFileName = this.beatmap.bg; // 无背景图则为""

        this.thumbImg = `https://cdn.sayobot.cn:25225/beatmaps/${this.sid}/covers/cover.jpg`;
        this.previewMp3 = `https://cdn.sayobot.cn:25225/preview/${this.sid}.mp3`;
        this.fullMp3 = (this.audioFileName) ? `https://dl.sayobot.cn/beatmaps/files/${this.sid}/${this.audioFileName}` : null;
        this.background = (this.bgFileName) ? `https://dl.sayobot.cn/beatmaps/files/${this.sid}/${this.bgFileName}` : null;
        
        this.setLink = `https://osu.ppy.sh/beatmapsets/${this.sid}`;
    }
}



class SearchResult {
    constructor(result) {
        this.status = result.status;
        if (this.status === 0) {
            this.beatmapInfo = new BeatmapInfo(result.data);
        }
    }

    success() {
        return (this.status === 0);
    }
}

class SayabotApi {
    static async apiRequestV2(options) {
        const contents = (options) ? querystring.stringify(options) : "";
        const url = "https://api.sayobot.cn/v2/beatmapinfo?" + contents;
        return await fetch(url).then(res => res.json());
    }

    /**
     * sayabot搜索谱面信息
     * @param {Number} sid setId
     * @returns {BeatmapInfo|{code, message}} 返回BeatmapInfo，出错时返回 {code: "error"} 或 {code: 404} 
     */
    static async search(sid) {
        let params = { K: sid, T: 0 }; // T=1 匹配bid
        try {
            const result = await this.apiRequestV2(params);
            if (!result) return { code: "error", message: "获取谱面详情失败" };
            const searchResult = new SearchResult(result);
            if (!searchResult.success()) return { code: 404, message: "查不到该谱面信息（谱面setId：" + sid + "）" };
            return searchResult.beatmapInfo;
        }
        catch (ex) {
            console.log("[sayabot] " + ex);
            return { code: "error", message: "获取谱面详情出错" };
        }
    }
}


module.exports = SayabotApi;