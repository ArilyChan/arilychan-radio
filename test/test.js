"use strict";

const Arg = require("../lib/command/arg");

let myQQ = 1;
const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
rl.on("line", async (line) => {
    try {
        let beatmapInfo = await new Arg(line).getBeatmapInfo();

        console.log(beatmapInfo.fullMp3);
    }
    catch (ex) {
        console.log(ex);
    }
});

