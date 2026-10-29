import { chromium, Browser, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const ffmpegPath = ffmpegInstaller.path;

interface ScriptScene {
  id: string;
  title: string;
  text: string;
  audioFile: string;
  duration: number; // in seconds, determined after TTS
}

const SCENES: ScriptScene[] = [
  {
    id: "scene_1_intro",
    title: "Welcome to Operator",
    text: "Welcome to Operator — the autonomous AI business operating system that answers calls, books appointments, and captures customers around the clock. In this demo, we'll see how any business can set up their AI receptionist in under three minutes.",
    audioFile: "",
    duration: 0,
  },
  {
    id: "scene_2_landing",
    title: "Starting from Homepage",
    text: "From our homepage, simply click 'Start Free Trial' to launch the guided setup journey.",
    audioFile: "",
    duration: 0,
  },
  {
    id: "scene_3_url_input",
    title: "Instant Website Input",
    text: "Onboarding is completely frictionless. All you need is your website URL. Here, we enter 'operatordemosalon.com' and click 'Set Up Operator'.",
    audioFile: "",
    duration: 0,
  },
  {
    id: "scene_4_ai_generation",
    title: "Autonomous AI Analysis",
    text: "Operator's AI engine instantly inspects your domain. It detects your industry vertical, extracts operating hours, indexes your service offerings, and builds a dedicated conversational knowledge base in real time.",
    audioFile: "",
    duration: 0,
  },
  {
    id: "scene_5_review_profile",
    title: "Reviewing Business Details",
    text: "In the review step, everything is pre-configured. Operator detected our salon name, address in Bandra West, Mumbai, phone number, and hours from Tuesday through Sunday, 10 AM to 8 PM.",
    audioFile: "",
    duration: 0,
  },
  {
    id: "scene_6_services_catalog",
    title: "Services Catalog in Rupees",
    text: "Our service catalog is fully organized with duration and transparent pricing: Haircut and Styling for 500 rupees, Bridal Styling for 1,200 rupees, and Organic Herbal Facial for 1,800 rupees. Everything is ready for immediate booking.",
    audioFile: "",
    duration: 0,
  },
  {
    id: "scene_7_greeting_launch",
    title: "AI Greeting and Launch",
    text: "The AI receptionist persona is tailored to our salon with a warm, professional greeting. With a single click on 'Launch Operator', your AI workspace goes live.",
    audioFile: "",
    duration: 0,
  },
  {
    id: "scene_8_dashboard",
    title: "Live Dashboard & Daily Operations",
    text: "And just like that, you arrive at your live dashboard. Here you can monitor real-time calls, track customer sentiment, and manage confirmed appointments seamlessly. Deploy Operator for your business today at operator.nexxtechnologies.com.",
    audioFile: "",
    duration: 0,
  },
];

async function generateTTSAudio(tempDir: string) {
  console.log("Generating high-definition narration audio with Edge TTS...");
  const tts = new MsEdgeTTS();
  await tts.setMetadata("en-US-ChristopherNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const audioPath = path.join(tempDir, `audio_${i + 1}.mp3`);
    scene.audioFile = audioPath;

    // Use cached if already generated and non-empty
    if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000) {
      // Determine duration
      try {
        const probeCmd = `"${ffmpegPath}" -i "${audioPath}" 2>&1`;
        const out = execSync(probeCmd, { encoding: "utf8" });
        const match = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (match) {
          scene.duration = parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]);
        } else {
          scene.duration = 10;
        }
      } catch (err: any) {
        const out = err.stdout || err.stderr || err.message || "";
        const match = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        scene.duration = match ? parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]) : 10;
      }
      console.log(`  [Scene ${i + 1}] (cached) "${scene.title}" -> ${scene.duration.toFixed(2)}s`);
      continue;
    }

    const { audioStream } = tts.toStream(scene.text);
    const writeStream = fs.createWriteStream(audioPath);

    await new Promise((resolve, reject) => {
      audioStream.pipe(writeStream);
      writeStream.on("finish", () => resolve(true));
      writeStream.on("error", reject);
    });

    try {
      const probeCmd = `"${ffmpegPath}" -i "${audioPath}" 2>&1`;
      const out = execSync(probeCmd, { encoding: "utf8" });
      const match = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (match) {
        scene.duration = parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]);
      } else {
        scene.duration = 10;
      }
    } catch (err: any) {
      const out = err.stdout || err.stderr || err.message || "";
      const match = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      scene.duration = match ? parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]) : 10;
    }

    console.log(`  [Scene ${i + 1}] "${scene.title}" -> ${scene.duration.toFixed(2)}s`);
  }
}

function generateSrtCaptions(outputPath: string): string {
  let srt = "";
  let currentTime = 0;

  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    const start = currentTime;
    const end = currentTime + s.duration;

    const formatTime = (sec: number) => {
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const secs = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    };

    srt += `${i + 1}\n`;
    srt += `${formatTime(start)} --> ${formatTime(end)}\n`;
    srt += `${s.text}\n\n`;

    currentTime = end + 0.3;
  }

  fs.writeFileSync(outputPath, srt, "utf8");
  return srt;
}

async function setupVisualCursor(page: Page) {
  await page.evaluate(() => {
    if (document.getElementById("playwright-custom-cursor")) return;
    const cursor = document.createElement("div");
    cursor.id = "playwright-custom-cursor";
    cursor.style.position = "fixed";
    cursor.style.top = "0px";
    cursor.style.left = "0px";
    cursor.style.width = "22px";
    cursor.style.height = "22px";
    cursor.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%236366f1' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolygon points='3 3 10 21 14 14 21 10 3 3'/%3E%3C/svg%3E")`;
    cursor.style.backgroundRepeat = "no-repeat";
    cursor.style.pointerEvents = "none";
    cursor.style.zIndex = "99999999";
    cursor.style.transition = "transform 0.1s linear";
    cursor.style.transform = "translate(960px, 540px)";

    const ripple = document.createElement("div");
    ripple.id = "playwright-click-ripple";
    ripple.style.position = "fixed";
    ripple.style.top = "0px";
    ripple.style.left = "0px";
    ripple.style.width = "40px";
    ripple.style.height = "40px";
    ripple.style.borderRadius = "50%";
    ripple.style.border = "3px solid rgba(99, 102, 241, 0.9)";
    ripple.style.backgroundColor = "rgba(99, 102, 241, 0.25)";
    ripple.style.pointerEvents = "none";
    ripple.style.zIndex = "99999998";
    ripple.style.opacity = "0";
    ripple.style.transform = "translate(-50%, -50%) scale(0.5)";
    ripple.style.transition = "transform 0.3s ease-out, opacity 0.3s ease-out";

    document.body.appendChild(cursor);
    document.body.appendChild(ripple);
  });
}

async function moveCursor(page: Page, targetX: number, targetY: number, steps = 15) {
  const currentPos = await page.evaluate(() => {
    const c = document.getElementById("playwright-custom-cursor");
    if (!c) return { x: 960, y: 540 };
    const transform = c.style.transform;
    const match = transform.match(/translate\(([^p]+)px,\s*([^p]+)px\)/);
    return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : { x: 960, y: 540 };
  });

  const deltaX = (targetX - currentPos.x) / steps;
  const deltaY = (targetY - currentPos.y) / steps;

  for (let i = 1; i <= steps; i++) {
    const nextX = currentPos.x + deltaX * i;
    const nextY = currentPos.y + deltaY * i;
    await page.evaluate(({ x, y }) => {
      const c = document.getElementById("playwright-custom-cursor");
      if (c) c.style.transform = `translate(${x}px, ${y}px)`;
    }, { x: nextX, y: nextY });
    await page.mouse.move(nextX, nextY);
    await page.waitForTimeout(20);
  }
}

async function clickCursor(page: Page, x: number, y: number) {
  await moveCursor(page, x, y, 8);
  await page.evaluate(({ x, y }) => {
    const ripple = document.getElementById("playwright-click-ripple");
    if (ripple) {
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.opacity = "1";
      ripple.style.transform = "translate(-50%, -50%) scale(1.4)";
      setTimeout(() => {
        ripple.style.opacity = "0";
        ripple.style.transform = "translate(-50%, -50%) scale(0.5)";
      }, 180);
    }
  }, { x, y });
  await page.mouse.click(x, y);
  await page.waitForTimeout(180);
}

async function smoothScroll(page: Page, distance: number, steps = 10) {
  const stepDist = distance / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy({ top: d, behavior: "smooth" }), stepDist);
    await page.waitForTimeout(70);
  }
}

async function preWarmRoutes(browser: Browser) {
  console.log("Pre-warming routes to ensure instantaneous rendering...");
  const page = await browser.newPage();
  try {
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(500);
    await page.goto("http://localhost:3000/onboarding?demo=true", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(500);
    await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(500);
  } catch (e) {}
  await page.close();
  console.log("Pre-warming complete! Next.js routes are warm.");
}

async function recordSegment(
  browser: Browser,
  authPath: string,
  targetUrl: string,
  outDir: string,
  actionFn: (page: Page) => Promise<void>
): Promise<string> {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync(authPath) ? authPath : undefined,
    recordVideo: {
      dir: outDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1000);
  await setupVisualCursor(page);

  await actionFn(page);

  const video = page.video();
  await page.close();
  await context.close();

  if (!video) throw new Error("Video recording failed for " + targetUrl);
  return await video.path();
}

function trimSegmentToRenderedUI(rawPath: string, cleanPath: string, tempDir: string): number {
  let firstGoodSecond = 0;
  const testFramePath = path.join(tempDir, `test_trim_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`);

  for (let s = 0; s <= 20; s += 0.25) {
    try {
      execSync(`"${ffmpegPath}" -y -ss ${s} -i "${rawPath}" -frames:v 1 "${testFramePath}"`, { stdio: "ignore" });
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
  if (fs.existsSync(testFramePath)) {
    try { fs.unlinkSync(testFramePath); } catch (e) {}
  }

  execSync(`"${ffmpegPath}" -y -ss ${firstGoodSecond} -i "${rawPath}" -c:v libx264 -preset fast -crf 18 "${cleanPath}"`, { stdio: "ignore" });
  return firstGoodSecond;
}

async function runCleanMultiSegmentRecording(tempDir: string): Promise<string[]> {
  console.log("Launching Chromium for Clean Zero-Blank Multi-Segment Recording...");
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const browser = await chromium.launch({ headless: true });

  // Pre-warm routes so page transitions take minimal time
  await preWarmRoutes(browser);

  const segmentDir = path.join(tempDir, "segments");
  if (!fs.existsSync(segmentDir)) fs.mkdirSync(segmentDir, { recursive: true });

  // 1. Segment 1: Landing Page (22s)
  console.log("Recording Segment 1: Landing Page...");
  const rawSeg1 = await recordSegment(
    browser,
    authPath,
    "http://localhost:3000/",
    segmentDir,
    async (page: Page) => {
      // Explore hero section
      await moveCursor(page, 960, 360, 20);
      await page.waitForTimeout(3500);
      await moveCursor(page, 800, 440, 15);
      await page.waitForTimeout(3000);
      await moveCursor(page, 960, 500, 15);
      await page.waitForTimeout(3000);

      // Scroll down to showcase features
      await smoothScroll(page, 450, 10);
      await page.waitForTimeout(3500);
      await smoothScroll(page, -450, 10);
      await page.waitForTimeout(2500);

      // Glide cursor to Start Free Trial button and click
      const ctaBtn = await page.$("a[href*='sign-in'], a[href*='onboarding'], button:has-text('Get Started'), button:has-text('Start free trial')");
      let ctaBox = ctaBtn ? await ctaBtn.boundingBox() : null;
      if (ctaBox) {
        await clickCursor(page, ctaBox.x + ctaBox.width / 2, ctaBox.y + ctaBox.height / 2);
      } else {
        await clickCursor(page, 960, 560);
      }
      await page.waitForTimeout(2500);
    }
  );

  // 2. Segment 2: Onboarding Flow (70s)
  console.log("Recording Segment 2: Onboarding Flow...");
  const rawSeg2 = await recordSegment(
    browser,
    authPath,
    "http://localhost:3000/onboarding?demo=true",
    segmentDir,
    async (page: Page) => {
      // Step 1: Input URL
      const urlInput = await page.$("#ob-url, input[placeholder*='acmedental']");
      if (urlInput) {
        const box = await urlInput.boundingBox();
        if (box) {
          await clickCursor(page, box.x + 80, box.y + box.height / 2);
        }
        await page.evaluate(() => {
          const inp = document.querySelector("#ob-url") as HTMLInputElement;
          if (inp) inp.value = "";
        });
        for (const char of "operatordemosalon.com") {
          await page.keyboard.type(char, { delay: 65 });
        }
      }
      await page.waitForTimeout(2000);

      // Click Set Up Operator
      const setupBtn = await page.$("button:has-text('Set Up Operator')");
      if (setupBtn) {
        const box = await setupBtn.boundingBox();
        if (box) {
          await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
        }
      }
      await page.waitForTimeout(1000);

      // Step 2: AI Generation Console (observe progress ticks)
      for (let tick = 0; tick < 14; tick++) {
        await moveCursor(page, 900 + (tick % 3) * 40, 500 + (tick % 4) * 25, 10);
        await page.waitForTimeout(800);
      }

      // Step 3: Review Business Details
      await setupVisualCursor(page);
      await moveCursor(page, 750, 420, 15);
      await page.waitForTimeout(2500);
      await moveCursor(page, 750, 560, 15);
      await page.waitForTimeout(3000);

      // Click Next to Services
      const nextToServices = await page.$("button:has-text('Next')");
      if (nextToServices) {
        const box = await nextToServices.boundingBox();
        if (box) {
          await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
        }
      }
      await page.waitForTimeout(2500);

      // Step 4: Services Catalog in Rupees
      await setupVisualCursor(page);
      await moveCursor(page, 750, 400, 15); // Haircut ₹500
      await page.waitForTimeout(3000);
      await moveCursor(page, 750, 480, 15); // Bridal ₹1,200
      await page.waitForTimeout(3000);
      await moveCursor(page, 750, 560, 15); // Facial ₹1,800
      await page.waitForTimeout(3000);

      // Click Next to Greeting
      const nextToGreeting = await page.$("button:has-text('Next')");
      if (nextToGreeting) {
        const box = await nextToGreeting.boundingBox();
        if (box) {
          await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
        }
      }
      await page.waitForTimeout(2500);

      // Step 5: Greeting & Launch
      await setupVisualCursor(page);
      await moveCursor(page, 960, 450, 15);
      await page.waitForTimeout(2500);

      const launchBtn = await page.$("button:has-text('Launch Operator')");
      if (launchBtn) {
        const box = await launchBtn.boundingBox();
        if (box) {
          await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
        }
      }
      await page.waitForTimeout(4500);

      // Click Go to Dashboard
      const dashBtn = await page.$("button:has-text('Go to Dashboard')");
      if (dashBtn) {
        const box = await dashBtn.boundingBox();
        if (box) {
          await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
        }
      }
      await page.waitForTimeout(2000);
    }
  );

  // 3. Segment 3: Dashboard Walkthrough (18s)
  console.log("Recording Segment 3: Dashboard Walkthrough...");
  const rawSeg3 = await recordSegment(
    browser,
    authPath,
    "http://localhost:3000/dashboard",
    segmentDir,
    async (page: Page) => {
      // Hover status badge
      await moveCursor(page, 620, 80, 15);
      await page.waitForTimeout(2500);
      // Hover KPI metrics
      await moveCursor(page, 450, 200, 15);
      await page.waitForTimeout(2200);
      await moveCursor(page, 850, 200, 15);
      await page.waitForTimeout(2200);
      await moveCursor(page, 1250, 200, 15);
      await page.waitForTimeout(2200);

      // Scroll appointments
      await smoothScroll(page, 280, 8);
      await page.waitForTimeout(3000);
      await smoothScroll(page, -280, 8);
      await page.waitForTimeout(2200);

      // Hold on live dashboard for smooth closing
      await moveCursor(page, 960, 480, 15);
      await page.waitForTimeout(3500);
    }
  );

  await browser.close();

  // Trim initial blank load from each segment to ensure 100% active UI frames
  console.log("Trimming initial loading delays from each segment...");
  const cleanSeg1 = path.join(tempDir, "clean_seg1.mp4");
  const cleanSeg2 = path.join(tempDir, "clean_seg2.mp4");
  const cleanSeg3 = path.join(tempDir, "clean_seg3.mp4");

  trimSegmentToRenderedUI(rawSeg1, cleanSeg1, tempDir);
  trimSegmentToRenderedUI(rawSeg2, cleanSeg2, tempDir);
  trimSegmentToRenderedUI(rawSeg3, cleanSeg3, tempDir);

  return [cleanSeg1, cleanSeg2, cleanSeg3];
}

async function composeCleanMasterVideo(segments: string[], tempDir: string, finalMp4Path: string) {
  console.log("Merging narration audio and seamless video segments...");

  // 1. Audio Concat
  const concatListPath = path.join(tempDir, "audio_concat.txt");
  const concatLines = SCENES.map((s) => `file '${path.resolve(s.audioFile).replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(concatListPath, concatLines, "utf8");

  const masterAudioPath = path.join(tempDir, "master_narration.mp3");
  const audioConcatCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${concatListPath}" -c:a libmp3lame -q:a 2 "${masterAudioPath}"`;
  execSync(audioConcatCmd, { stdio: "inherit" });

  let audioDuration = 100;
  try {
    const probeCmd = `"${ffmpegPath}" -i "${masterAudioPath}" 2>&1`;
    const out = execSync(probeCmd, { encoding: "utf8" });
    const match = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (match) {
      audioDuration = parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]);
    }
  } catch (e) {}

  console.log(`Master narration length: ${audioDuration.toFixed(2)}s`);

  // 2. Video Concat of clean trimmed segments
  const videoConcatListPath = path.join(tempDir, "video_concat.txt");
  const videoConcatLines = segments.map((seg) => `file '${path.resolve(seg).replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(videoConcatListPath, videoConcatLines, "utf8");

  const intermediateVideoPath = path.join(tempDir, "concat_video.mp4");
  const videoConcatCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${videoConcatListPath}" -vf "fps=30,scale=1920:1080" -c:v libx264 -preset fast -crf 18 "${intermediateVideoPath}"`;
  execSync(videoConcatCmd, { stdio: "inherit" });

  // 3. Final Master Render: Video + Audio (NO fade in from black, starts immediately on UI!)
  const fadeOutStart = Math.max(0, audioDuration - 1.0);
  const finalRenderCmd = `"${ffmpegPath}" -y -i "${intermediateVideoPath}" -i "${masterAudioPath}" ` +
    `-filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=15,scale=1920:1080,fps=30,fade=t=out:st=${fadeOutStart}:d=1.0[v];[1:a]afade=t=in:st=0:d=0.2,afade=t=out:st=${fadeOutStart}:d=1.0[a]" ` +
    `-map "[v]" -map "[a]" -t ${audioDuration.toFixed(2)} ` +
    `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p ` +
    `-c:a aac -b:a 192k "${finalMp4Path}"`;

  execSync(finalRenderCmd, { stdio: "inherit" });
  console.log("Master MP4 rendered successfully:", finalMp4Path);
}

async function verifyVideoQuality(videoPath: string, tempDir: string) {
  console.log("=== Mandatory Verification Quality Gate ===");
  if (!fs.existsSync(videoPath)) throw new Error("Video file does not exist: " + videoPath);
  const size = fs.statSync(videoPath).size;
  console.log("Video File Size:", (size / (1024 * 1024)).toFixed(2), "MB");
  if (size < 1024 * 1024) throw new Error("Video file size is suspiciously small: " + size);

  // Probe with ffmpeg safely
  try {
    const probeCmd = `"${ffmpegPath}" -i "${videoPath}" 2>&1`;
    const probeOut = execSync(probeCmd, { encoding: "utf8" });
    console.log("FFmpeg Probe Output:\n", probeOut.split("\n").filter((l: string) => l.includes("Duration") || l.includes("Stream")).join("\n"));
  } catch (err: any) {
    const probeOut = err.stdout || err.stderr || err.message || "";
    console.log("FFmpeg Probe Output:\n", probeOut.split("\n").filter((l: string) => l.includes("Duration") || l.includes("Stream")).join("\n"));
  }

  // Extract frames every 5 seconds
  const framesDir = path.join(tempDir, "extracted_frames");
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

  const extractCmd = `"${ffmpegPath}" -y -i "${videoPath}" -vf "fps=1/5" "${path.join(framesDir, "frame_%03d.png")}"`;
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

  // Generate thumbnail from middle frame
  const thumbPath = path.join(path.dirname(videoPath), "thumbnail.png");
  if (frames.length > 5) {
    const chosenFrame = path.join(framesDir, frames[Math.floor(frames.length / 2)]);
    fs.copyFileSync(chosenFrame, thumbPath);
    console.log("Generated thumbnail:", thumbPath);
  }
}

async function main() {
  const tempDir = path.join(process.cwd(), "temp", "onboarding-demo");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const outputDir = path.join(process.cwd(), "artifacts", "operator-client-demo");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const brainDir = "C:\\Users\\Jaydeep Chandegara\\.gemini\\antigravity\\brain\\1a37b562-f8eb-485b-ae7b-6e317087c57c";

  const finalMp4Path = path.join(outputDir, "operator-client-demo.mp4");
  const captionsPath = path.join(outputDir, "captions.srt");
  const scriptPath = path.join(outputDir, "demo-script.md");

  // Step 1: TTS
  await generateTTSAudio(tempDir);

  // Step 2: Captions & Script
  generateSrtCaptions(captionsPath);
  const scriptDoc = `# Operator Client Onboarding Walkthrough Script\n\n` +
    SCENES.map((s, idx) => `### Scene ${idx + 1}: ${s.title} (${s.duration.toFixed(1)}s)\n\n> "${s.text}"\n`).join("\n");
  fs.writeFileSync(scriptPath, scriptDoc, "utf8");

  // Step 3: Clean Multi-Segment Recording & UI Trimming
  const segments = await runCleanMultiSegmentRecording(tempDir);

  // Step 4: Final compose
  await composeCleanMasterVideo(segments, tempDir, finalMp4Path);

  // Step 5: Quality verify
  await verifyVideoQuality(finalMp4Path, tempDir);

  // Step 6: Copy to Brain Artifact
  if (fs.existsSync(brainDir)) {
    fs.copyFileSync(finalMp4Path, path.join(brainDir, "operator-client-demo.mp4"));
    if (fs.existsSync(captionsPath)) fs.copyFileSync(captionsPath, path.join(brainDir, "captions.srt"));
    if (fs.existsSync(scriptPath)) fs.copyFileSync(scriptPath, path.join(brainDir, "demo-script.md"));
    const thumbPath = path.join(outputDir, "thumbnail.png");
    if (fs.existsSync(thumbPath)) fs.copyFileSync(thumbPath, path.join(brainDir, "thumbnail.png"));
    console.log("Successfully copied deliverables to brain artifacts directory!");
  }

  console.log("\n=======================================================");
  console.log("🎉 Complete Functional Client Onboarding Video Delivered!");
  console.log("Path:", finalMp4Path);
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("FATAL ERROR in Onboarding Demo Generator:", err);
  process.exit(1);
});
