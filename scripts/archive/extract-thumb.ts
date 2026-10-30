import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync } from "child_process";
import * as path from "path";

const ffmpeg = ffmpegInstaller.path;
const brainDir = "C:\\Users\\Jaydeep Chandegara\\.gemini\\antigravity\\brain\\1a37b562-f8eb-485b-ae7b-6e317087c57c";

// Extract thumbnail from real video at 00:00:04
const thumbLocal = "artifacts/operator-client-demo/thumbnail.png";
const thumbBrain = path.join(brainDir, "thumbnail.png");

execSync(`"${ffmpeg}" -y -ss 00:00:04 -i artifacts/operator-client-demo/operator-client-demo.mp4 -vframes 1 -q:v 2 "${thumbLocal}"`);
execSync(`"${ffmpeg}" -y -ss 00:00:04 -i artifacts/operator-client-demo/operator-client-demo.mp4 -vframes 1 -q:v 2 "${thumbBrain}"`);
console.log("Real video thumbnails extracted successfully!");

