// const { yellow, cyan, magenta } = require('../../ll-modules/ll-utilities/mk-utilities');
// const path = require('path');
// const handleExternalLinkImage = require('../external-link-bot/external-link-listener'); // <-- NEW
// const makeGif = require('../gif-bot/make-gif');

// exports.fileShared = async ({ event, client }) => {
//   try {
//     const handledImageFiles = ["image/gif", "image/jpeg", "image/png"];
//     magenta(`launching fileShared handler`);
//     magenta(event);
//     const fileInfo = await client.files.info({
//       file: event.file_id,
//     });
//     yellow(`handling ${event.file_id}, here's the fileInfo:`);
//     yellow(fileInfo);

//     // NEW: Handle external link images
//     if (
//       event.channel_id == process.env.SLACK_EXTERNAL_LINKS_CHANNEL &&
//       handledImageFiles.includes(fileInfo.file.mimetype)
//     ) {
//       await handleExternalLinkImage(event, client, fileInfo);
//       magenta(`handled image file with external-link bot`);
//     } else if (
//       event.channel_id == process.env.SLACK_FCPXML_CHANNEL &&
//       path.extname(fileInfo.file.name) == ".fcpxml"
//     ) {
//       yellow(`handling ${fileInfo.file.name} with ext ${path.extname(fileInfo.file.name)}`);
//       cyan(event);
//       await handleSlackedFcpxml(event, client, fileInfo);
//     } else if (event.channel_id == process.env.SLACK_CREATE_GIF_CHANNEL) {
//       if (["mp4", "mov"].includes(fileInfo.file.filetype)) {
//         yellow(`handling movie ${fileInfo.file.name} with ext ${path.extname(fileInfo.file.name)}`);
//         const gifResult = await makeGif({
//           fileInfo: fileInfo,
//           client: client,
//           event: event,
//           width: 355,
//           height: 200,
//         });
//         magenta(gifResult);
//       }
//       cyan(event);
//       // await handleSlackedFcpxml(event, client, fileInfo)
//     }
//   } catch (error) {
//     yellow(`eventHandler.fileShared failed`);
//     console.error(error);
//   }
// };