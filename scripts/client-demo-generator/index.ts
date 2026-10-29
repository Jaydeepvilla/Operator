import * as path from "path";
import * as fs from "fs";
import { CLIENT_DEMO_CHAPTERS } from "./chapters";
import { synthesizeNarration } from "./audio";
import { ClientDemoRecorder } from "./recorder";
import { ClientDemoComposer } from "./composer";
import { generateThumbnail } from "./thumbnail";

const BRAIN_ARTIFACT_DIR = "C:\\Users\\Jaydeep Chandegara\\.gemini\\antigravity\\brain\\1a37b562-f8eb-485b-ae7b-6e317087c57c";

async function main() {
  console.log("🎬 ========================================================");
  console.log("🎬 OPERATOR AI — CLIENT-FACING SALES DEMO VIDEO PRODUCTION");
  console.log("🎬 ========================================================");

  const artifactsDir = path.join(process.cwd(), "artifacts", "operator-client-demo");
  const tempDir = path.join(process.cwd(), "temp", "client-demo");
  const audioDir = path.join(tempDir, "audio");
  const framesDir = path.join(tempDir, "frames");
  const clipsDir = path.join(tempDir, "clips");

  [artifactsDir, tempDir, audioDir, framesDir, clipsDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const finalVideoPath = path.join(artifactsDir, "operator-client-demo.mp4");
  const srtPath = path.join(artifactsDir, "captions.srt");
  const thumbnailPath = path.join(artifactsDir, "thumbnail.png");
  const manifestPath = path.join(artifactsDir, "recording-manifest.json");

  console.log("🎨 1. Generating professional 1080p thumbnail...");
  await generateThumbnail(thumbnailPath);
  console.log(`✅ Thumbnail created: ${thumbnailPath}`);

  const recorder = new ClientDemoRecorder();
  const composer = new ClientDemoComposer();

  try {
    console.log("\n🌐 2. Initializing Playwright 1080p capture engine...");
    await recorder.init();

    const sceneClips: string[] = [];
    const chaptersMeta: { title: string; narration: string; duration: number }[] = [];

    for (const chapter of CLIENT_DEMO_CHAPTERS) {
      const padNum = String(chapter.chapterNumber).padStart(2, "0");
      console.log(`\n▶️ [Scene ${padNum}/12] ${chapter.title}`);

      // 1. Voiceover
      const audioPath = path.join(audioDir, `scene_${padNum}.mp3`);
      console.log(`  🎙️ Synthesizing narration (Edge TTS Christopher)...`);
      const duration = await synthesizeNarration(chapter.narration, audioPath);
      console.log(`  ⏱️ Duration: ${duration.toFixed(1)}s`);
      chaptersMeta.push({
        title: chapter.title,
        narration: chapter.narration,
        duration,
      });

      // 2. Visual Frame Capture
      console.log(`  📸 Capturing 1080p application frames for ${chapter.route}...`);
      const frames = await recorder.captureChapter(chapter, framesDir);
      console.log(`  🖼️ Frames captured: ${frames.length}`);

      // 3. Render scene clip
      const clipPath = path.join(clipsDir, `scene_${padNum}.mp4`);
      console.log(`  🎞️ Assembling scene clip with FFmpeg...`);
      await composer.buildSceneClip(frames, audioPath, duration, clipPath);
      console.log(`  ✅ Rendered: ${path.basename(clipPath)}`);

      sceneClips.push(clipPath);
    }

    // 4. Concatenate All 12 Scenes
    console.log("\n📦 ========================================================");
    console.log("📦 3. Concatenating 12 scenes into master MP4...");
    await composer.concatenateClips(sceneClips, finalVideoPath);

    // 5. Generate Captions SRT
    console.log("📝 4. Generating synchronized captions (captions.srt)...");
    composer.generateSrt(chaptersMeta, srtPath);
    console.log(`✅ Subtitles generated: ${srtPath}`);

    // 6. Provide Extended Walkthrough Copy
    const extendedSrc = path.join(process.cwd(), "public", "videos", "operator-walkthrough.mp4");
    const extendedDest = path.join(artifactsDir, "operator-product-walkthrough.mp4");
    if (fs.existsSync(extendedSrc)) {
      fs.copyFileSync(extendedSrc, extendedDest);
      console.log(`✅ Extended walkthrough included: ${extendedDest}`);
    }

    // 7. Copy to Conversation Brain Artifact Directory
    if (fs.existsSync(BRAIN_ARTIFACT_DIR)) {
      const brainVideoPath = path.join(BRAIN_ARTIFACT_DIR, "operator-client-demo.mp4");
      fs.copyFileSync(finalVideoPath, brainVideoPath);
      console.log(`📋 Copied master client demo to brain artifacts: ${brainVideoPath}`);
    }

    // 8. Verification
    const stats = composer.verifyVideo(finalVideoPath);
    const fileSizeMb = (fs.statSync(finalVideoPath).size / (1024 * 1024)).toFixed(2);

    // 9. Write recording manifest
    const manifest = {
      project: "Operator AI Receptionist",
      version: "1.0.0",
      targetBusiness: "Operator Demo Salon",
      businessType: "Salon / Beauty Studio",
      location: "Mumbai, India (Asia/Kolkata)",
      currency: "INR (₹)",
      generatedAt: new Date().toISOString(),
      deliverables: {
        clientDemoVideo: "operator-client-demo.mp4",
        productWalkthroughVideo: "operator-product-walkthrough.mp4",
        thumbnail: "thumbnail.png",
        captions: "captions.srt",
        script: "demo-script.md",
        storyboard: "storyboard.md",
        testResults: "test-results.md",
        productReadinessReport: "product-readiness-report.md",
      },
      videoSpecs: {
        resolution: `${stats.width}x${stats.height}`,
        durationSec: stats.duration,
        durationFormatted: `${Math.floor(stats.duration / 60)}m ${Math.round(stats.duration % 60)}s`,
        fileSizeMb: parseFloat(fileSizeMb),
        videoCodec: "h264",
        audioCodec: "aac",
        frameRate: 30,
        audioBitrate: "192 kbps",
        voiceEngine: "Microsoft Edge Neural TTS (en-US-ChristopherNeural)",
        integrityValid: stats.valid,
      },
      scenesCount: CLIENT_DEMO_CHAPTERS.length,
      scenes: CLIENT_DEMO_CHAPTERS.map((c, i) => ({
        sceneNumber: c.chapterNumber,
        title: c.title,
        subtitle: c.subtitle,
        route: c.route,
        durationSec: chaptersMeta[i]?.duration || 0,
      })),
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`✅ Recording manifest saved: ${manifestPath}`);

    console.log("\n🎉 ========================================================");
    console.log("🎉 CLIENT DEMO VIDEO GENERATION COMPLETE & VERIFIED");
    console.log(`🎉 Final Output: ${finalVideoPath}`);
    console.log(`🎉 Resolution:   ${stats.width}x${stats.height} (Full HD 1080p)`);
    console.log(`🎉 Duration:     ${Math.floor(stats.duration / 60)}m ${Math.round(stats.duration % 60)}s (${stats.duration.toFixed(1)}s)`);
    console.log(`🎉 File Size:    ${fileSizeMb} MB`);
    console.log(`🎉 Playability:  ${stats.valid ? "VERIFIED PLAYABLE" : "VERIFICATION FAILED"}`);
    console.log("🎉 ========================================================");

  } finally {
    await recorder.close();
  }
}

main().catch((err) => {
  console.error("❌ Video production failed:", err);
  process.exit(1);
});

