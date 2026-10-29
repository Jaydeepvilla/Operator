import * as path from "path";
import * as fs from "fs";
import { WALKTHROUGH_CHAPTERS } from "./chapters";
import { synthesizeNarration } from "./audio";
import { WalkthroughRecorder } from "./recorder";
import { WalkthroughComposer } from "./composer";

const ARTIFACT_DIR = "C:\\Users\\Jaydeep Chandegara\\.gemini\\antigravity\\brain\\1a37b562-f8eb-485b-ae7b-6e317087c57c";

async function main() {
  console.log("🎬 ========================================================");
  console.log("🎬 OPERATOR AI — AUTOMATED WALKTHROUGH VIDEO PRODUCTION");
  console.log("🎬 ========================================================");

  const workDir = path.join(process.cwd(), "temp", "walkthrough");
  const audioDir = path.join(workDir, "audio");
  const framesDir = path.join(workDir, "frames");
  const clipsDir = path.join(workDir, "clips");

  [workDir, audioDir, framesDir, clipsDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const publicVideoDir = path.join(process.cwd(), "public", "videos");
  if (!fs.existsSync(publicVideoDir)) fs.mkdirSync(publicVideoDir, { recursive: true });

  const finalVideoPath = path.join(publicVideoDir, "operator-walkthrough.mp4");
  const artifactVideoPath = path.join(ARTIFACT_DIR, "operator-walkthrough.mp4");

  const recorder = new WalkthroughRecorder();
  const composer = new WalkthroughComposer();

  try {
    console.log("🌐 Launching Playwright Full-HD 1080p capture engine...");
    await recorder.init();

    const chapterClips: string[] = [];

    for (const chapter of WALKTHROUGH_CHAPTERS) {
      const padNum = String(chapter.chapterNumber).padStart(2, "0");
      console.log(`\n▶️ [Chapter ${padNum}/12] ${chapter.title}`);

      // 1. Audio Narration
      const audioPath = path.join(audioDir, `chapter_${padNum}.mp3`);
      console.log(`  🎙️ Synthesizing neural narration (Edge TTS - Christopher)...`);
      const duration = await synthesizeNarration(chapter.narration, audioPath);
      console.log(`  ⏱️ Narration duration: ${duration.toFixed(1)}s`);

      // 2. Visual Frame Capture
      console.log(`  📸 Navigating to ${chapter.route} and capturing 1080p frames...`);
      const frames = await recorder.captureChapter(chapter, framesDir);
      console.log(`  🖼️ Captured ${frames.length} frames`);

      // 3. Assemble Chapter Video Clip
      const clipPath = path.join(clipsDir, `chapter_${padNum}.mp4`);
      console.log(`  🎞️ Rendering chapter video with FFmpeg...`);
      await composer.buildChapterClip(frames, audioPath, duration, clipPath);
      console.log(`  ✅ Chapter clip rendered: ${path.basename(clipPath)}`);

      chapterClips.push(clipPath);
    }

    // 4. Concatenate All Chapters
    console.log("\n📦 ========================================================");
    console.log("📦 Concatenating all 12 chapters into final Full-HD master...");
    await composer.concatenateClips(chapterClips, finalVideoPath);

    // Copy to artifact directory
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(finalVideoPath, artifactVideoPath);
      console.log(`📋 Copied master walkthrough to artifacts: ${artifactVideoPath}`);
    }

    // 5. Verification
    const stats = composer.verifyVideo(finalVideoPath);
    const fileSizeMb = (fs.statSync(finalVideoPath).size / (1024 * 1024)).toFixed(2);

    console.log("\n🎉 ========================================================");
    console.log("🎉 WALKTHROUGH VIDEO PRODUCTION COMPLETE & VERIFIED");
    console.log(`🎉 Master Video: ${finalVideoPath}`);
    console.log(`🎉 Resolution:   ${stats.width}x${stats.height} (Full HD 1080p)`);
    console.log(`🎉 Duration:     ${Math.floor(stats.duration / 60)}m ${Math.round(stats.duration % 60)}s (${stats.duration.toFixed(1)}s)`);
    console.log(`🎉 File Size:    ${fileSizeMb} MB`);
    console.log(`🎉 Integrity:    ${stats.valid ? "VALID & PLAYABLE" : "VERIFICATION FAILED"}`);
    console.log("🎉 ========================================================");

  } finally {
    await recorder.close();
  }
}

main().catch((err) => {
  console.error("❌ Video production failed:", err);
  process.exit(1);
});

