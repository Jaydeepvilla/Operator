import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync } from "child_process";
import * as fs from "fs";

const ffmpeg = ffmpegInstaller.path;
const outDir = "temp/check_frames";
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const times = [5, 15, 25, 45, 65, 85, 105, 125, 145, 165];
for (const t of times) {
  const p = `${outDir}/frame_${t}.png`;
  try {
    execSync(`"${ffmpeg}" -y -ss ${t} -i artifacts/operator-client-demo/operator-client-demo.mp4 -vframes 1 "${p}"`);
    console.log(`Frame at ${t}s size: ${fs.statSync(p).size} bytes`);
  } catch (err: any) {
    console.error(`Error at ${t}s:`, err.message);
  }
}

