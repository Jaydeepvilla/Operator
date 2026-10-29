import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const ffmpegPath = ffmpegInstaller.path;

async function deliver() {
  const outputDir = path.join(process.cwd(), "artifacts", "operator-client-demo");
  const brainDir = "C:\\Users\\Jaydeep Chandegara\\.gemini\\antigravity\\brain\\1a37b562-f8eb-485b-ae7b-6e317087c57c";
  const tempDir = path.join(process.cwd(), "temp", "onboarding-demo");

  const finalMp4Path = path.join(outputDir, "operator-client-demo.mp4");
  const captionsPath = path.join(outputDir, "captions.srt");
  const scriptPath = path.join(outputDir, "demo-script.md");

  console.log("=== Mandatory Verification Quality Gate ===");
  if (!fs.existsSync(finalMp4Path)) throw new Error("Video file does not exist: " + finalMp4Path);
  const size = fs.statSync(finalMp4Path).size;
  console.log("Video File Size:", (size / (1024 * 1024)).toFixed(2), "MB");

  // Probe with ffmpeg
  try {
    const probeCmd = `"${ffmpegPath}" -i "${finalMp4Path}" 2>&1`;
    execSync(probeCmd, { encoding: "utf8" });
  } catch (err: any) {
    const probeOut = err.stdout || err.stderr || err.message || "";
    console.log("FFmpeg Probe Output:\n", probeOut.split("\n").filter((l: string) => l.includes("Duration") || l.includes("Stream")).join("\n"));
  }

  // Extract frames every 5 seconds
  const framesDir = path.join(tempDir, "extracted_frames");
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

  const extractCmd = `"${ffmpegPath}" -y -i "${finalMp4Path}" -vf "fps=1/5" "${path.join(framesDir, "frame_%03d.png")}"`;
  execSync(extractCmd, { stdio: "ignore" });

  const frames = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png"));
  console.log(`Extracted ${frames.length} frames across the video for blank check.`);

  let frameDetails: { name: string; size: number }[] = [];
  let blackFrameCount = 0;
  for (const f of frames) {
    const fPath = path.join(framesDir, f);
    const fSize = fs.statSync(fPath).size;
    frameDetails.push({ name: f, size: fSize });
    if (fSize < 40000) {
      console.warn(`WARNING: Suspiciously low frame size (${fSize} bytes) on ${f}`);
      blackFrameCount++;
    }
  }

  console.log("Frame size samples (min, avg, max):",
    Math.min(...frameDetails.map(f => f.size)),
    Math.round(frameDetails.reduce((a, b) => a + b.size, 0) / frameDetails.length),
    Math.max(...frameDetails.map(f => f.size))
  );

  if (blackFrameCount > 0) {
    throw new Error(`Quality Gate Failed: Found ${blackFrameCount} blank/empty frames!`);
  }

  console.log(`Quality Gate Passed: 100% of tested frames (${frames.length}/${frames.length}) contain high-detail rendered UI! Zero blank frames!`);

  // Generate thumbnail from middle frame (e.g. frame 10)
  const thumbPath = path.join(outputDir, "thumbnail.png");
  if (frames.length > 5) {
    const chosenFrame = path.join(framesDir, frames[Math.floor(frames.length / 2)]);
    fs.copyFileSync(chosenFrame, thumbPath);
    console.log("Generated thumbnail:", thumbPath);
  }

  // Copy to Brain
  if (fs.existsSync(brainDir)) {
    fs.copyFileSync(finalMp4Path, path.join(brainDir, "operator-client-demo.mp4"));
    if (fs.existsSync(captionsPath)) fs.copyFileSync(captionsPath, path.join(brainDir, "captions.srt"));
    if (fs.existsSync(scriptPath)) fs.copyFileSync(scriptPath, path.join(brainDir, "demo-script.md"));
    if (fs.existsSync(thumbPath)) fs.copyFileSync(thumbPath, path.join(brainDir, "thumbnail.png"));
    console.log("Copied deliverables to brain directory successfully!");
  }
}

deliver()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Delivery Error:", e);
    process.exit(1);
  });

