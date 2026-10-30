import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const ffmpeg = ffmpegInstaller.path;

for (let i = 1; i <= 10; i++) {
  const sceneDir = `temp/continuous_demo/raw/scene_${i}`;
  if (fs.existsSync(sceneDir)) {
    const files = fs.readdirSync(sceneDir).filter(f => f.endsWith(".webm"));
    if (files.length > 0) {
      const webmPath = path.join(sceneDir, files[0]);
      const framePath = `temp/check_frames/scene_${i}_frame.png`;
      try {
        execSync(`"${ffmpeg}" -y -ss 00:00:02 -i "${webmPath}" -vframes 1 "${framePath}"`);
        console.log(`Scene ${i} (${files[0]}) frame size: ${fs.statSync(framePath).size} bytes`);
      } catch (err: any) {
        console.error(`Scene ${i} error:`, err.message);
      }
    }
  }
}

