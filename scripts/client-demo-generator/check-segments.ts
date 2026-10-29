import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const ffmpeg = ffmpegInstaller.path;
const tempDir = path.join(process.cwd(), "temp", "onboarding-demo");
const rawSeg1 = path.join(tempDir, "segments", "page@4049fefb88449165ef486176c5b2253a.webm");
const cleanSeg1 = path.join(tempDir, "clean_seg1.mp4");

function trimSegmentToRenderedUI(rawPath: string, cleanPath: string): number {
  let firstGoodSecond = 0;
  const testFramePath = path.join(tempDir, `test_trim_${Date.now()}.png`);
  for (let s = 0; s <= 20; s += 0.25) {
    try {
      execSync(`"${ffmpeg}" -y -ss ${s} -i "${rawPath}" -frames:v 1 "${testFramePath}"`, { stdio: "ignore" });
      if (fs.existsSync(testFramePath)) {
        const size = fs.statSync(testFramePath).size;
        if (size > 40000) {
          firstGoodSecond = s;
          console.log(`Segment ${path.basename(rawPath)}: first rendered UI at ${s}s (frame size: ${size} bytes)`);
          break;
        }
      }
    } catch (e) {}
  }
  if (fs.existsSync(testFramePath)) fs.unlinkSync(testFramePath);

  execSync(`"${ffmpeg}" -y -ss ${firstGoodSecond} -i "${rawPath}" -c:v libx264 -preset fast -crf 18 "${cleanPath}"`, { stdio: "ignore" });
  return firstGoodSecond;
}

const trimmedAt = trimSegmentToRenderedUI(rawSeg1, cleanSeg1);
console.log("Trimmed at:", trimmedAt);

// Now extract frame at 0.0s of cleanSeg1
const f0 = path.join(tempDir, "clean_seg1_f0.png");
execSync(`"${ffmpeg}" -y -ss 0.1 -i "${cleanSeg1}" -frames:v 1 "${f0}"`, { stdio: "ignore" });
const f0Size = fs.statSync(f0).size;
console.log("Frame 0 size of cleanSeg1:", f0Size, "bytes");
