#!/usr/bin/env node

var figlet = require("figlet");
var clear = require("clear");
const llog = require("learninglab-log");
// const { getSheetData } = require("./src/utils/ll-google-tools/ll-sheets-tools");

require("dotenv").config({ path: __dirname + `/.env.dev` });

console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY);

// store any arguments passed in using yargs
var yargs = require("yargs").argv;

yargs._.forEach((arg) => {
  // Assign "true" to any un-hyphenated argument
  yargs[arg] = true;
});

console.log("launching it.");

// options: rename, makefolders, proxy, proxyf2,

if (yargs.getSheetData) {
    // getSheetData({
    //     sheetId: yargs.id,
    //     sheetName: yargs.name,
    // });
} else if (yargs.rename) {
} else if (yargs.trailer) {

  // // Run the script with a video file argument
  // const videoFile = yargs.trailer;
  // if (!videoFile) {
  //   console.error('Usage: node processVideo.js <video-file>');
  //   process.exit(1);
  // }

  // trailerBot({inputFile: videoFile});

} else {

  console.log(`sorry, you didn't enter a recognized command.`);
}
