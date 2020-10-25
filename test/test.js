"use strict";

const Arg = require("../lib/command/arg");
const {v4: uuidv4} = require("uuid");

let myQQ = 1;
const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
rl.on("line", async (line) => {
    try {
        const command = line.trim().split(' ').filter(item => item !== '');
        if (command.length < 1) return;
        if (command[0].substring(0, 1) !== '!' && command[0].substring(0, 1) !== '！') return;
        if (command[0].length < 2) return;
        const act = command[0].substring(1);
        if (act === "dg") {
            let arg = command.slice(1).join(' ');
            let beatmapInfo = await new Arg(arg).getBeatmapInfo();
            console.log("sid:" + beatmapInfo.sid);
            console.log("uuid: "+ uuidv4());
        }
    }
    catch (ex) {
        console.log(ex);
    }
});

