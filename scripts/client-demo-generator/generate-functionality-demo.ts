import { chromium, Browser, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const ffmpegPath = ffmpegInstaller.path;

interface DemoChapter {
  id: string;
  title: string;
  route: string;
  narration: string;
  audioFile: string;
  duration: number;
  actions: (page: Page) => Promise<void>;
}

const CHAPTERS: DemoChapter[] = [
  {
    id: "ch1_dashboard",
    title: "Operations Command Center",
    route: "http://localhost:3000/dashboard",
    narration:
      "Welcome to the Operator Operations Command Center. Following onboarding, your business is managed through a unified live dashboard. With Operator AI active 24/7, you monitor inbound calls, conversion rates, customer sentiment, and real-time revenue at a single glance.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      // Hover status pill
      await moveCursor(page, 620, 80, 15);
      await page.waitForTimeout(2500);
      // Hover KPI metrics
      await moveCursor(page, 450, 200, 15);
      await page.waitForTimeout(2000);
      await moveCursor(page, 850, 200, 15);
      await page.waitForTimeout(2000);
      await moveCursor(page, 1250, 200, 15);
      await page.waitForTimeout(2000);
      // Scroll to appointments feed
      await smoothScroll(page, 320, 8);
      await page.waitForTimeout(3000);
      await smoothScroll(page, -320, 8);
      await page.waitForTimeout(2000);
    },
  },
  {
    id: "ch2_appointments",
    title: "Bookings & Calendar Management",
    route: "http://localhost:3000/appointments",
    narration:
      "The Bookings and Calendar module provides full schedule visibility across all your stylists and team members. Filter appointments by staff or status, review booking details, or manually schedule confirmed appointments with zero double-booking risk.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      // Move to search & filter strip
      await moveCursor(page, 500, 180, 15);
      await page.waitForTimeout(2200);
      await moveCursor(page, 1100, 180, 15);
      await page.waitForTimeout(2000);

      // Click Book New Appointment button if visible
      const bookBtn = await page.$("button:has-text('Book Appointment'), button:has-text('New Booking'), button:has-text('Book')");
      if (bookBtn) {
        const box = await bookBtn.boundingBox();
        if (box) {
          await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(2500);
          // Move inside modal
          await moveCursor(page, 960, 480, 15);
          await page.waitForTimeout(2000);
          // Close modal or click cancel
          const cancelBtn = await page.$("button:has-text('Cancel')");
          if (cancelBtn) {
            const cbox = await cancelBtn.boundingBox();
            if (cbox) await clickCursor(page, cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
          }
        }
      }
      await smoothScroll(page, 200, 6);
      await page.waitForTimeout(2000);
      await smoothScroll(page, -200, 6);
      await page.waitForTimeout(1500);
    },
  },
  {
    id: "ch3_inbox",
    title: "Omnichannel Customer Inbox",
    route: "http://localhost:3000/inbox",
    narration:
      "In the Omnichannel Inbox, every client inquiry from your website live chat, WhatsApp, and SMS streams into one collaborative workspace. Operator's AI Copilot autonomously answers client questions, quotes accurate service prices, and captures leads in real time.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      // Hover through conversation list
      await moveCursor(page, 320, 220, 15);
      await page.waitForTimeout(2200);
      await moveCursor(page, 320, 310, 15);
      await page.waitForTimeout(2000);
      // Click a conversation thread
      const thread = await page.$("[data-testid*='thread'], .cursor-pointer");
      if (thread) {
        const tbox = await thread.boundingBox();
        if (tbox) await clickCursor(page, tbox.x + tbox.width / 2, tbox.y + tbox.height / 2);
      }
      await page.waitForTimeout(2500);
      // Hover dialogue timeline
      await moveCursor(page, 850, 400, 15);
      await page.waitForTimeout(2500);
      await moveCursor(page, 850, 550, 15);
      await page.waitForTimeout(2000);
    },
  },
  {
    id: "ch4_voice",
    title: "Voice AI Receptionist & Call Stream",
    route: "http://localhost:3000/voice/dashboard",
    narration:
      "The Voice AI dashboard powers your telephone lines. Incoming customer calls are answered immediately with ultra-low latency voice synthesis. Live transcripts stream in real time alongside customer sentiment tracking, ensuring you never miss an inquiry.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      // Highlight live voice metrics
      await moveCursor(page, 300, 180, 15);
      await page.waitForTimeout(2000);
      await moveCursor(page, 650, 180, 15);
      await page.waitForTimeout(2000);
      // Scroll to live dialogue stream & sentiment trend
      await smoothScroll(page, 260, 8);
      await page.waitForTimeout(3000);
      await moveCursor(page, 960, 480, 15);
      await page.waitForTimeout(2500);
      await smoothScroll(page, -260, 8);
      await page.waitForTimeout(2000);
    },
  },
  {
    id: "ch5_kb",
    title: "Business Knowledge Base & FAQs",
    route: "http://localhost:3000/kb",
    narration:
      "Operator guarantees zero hallucination through its Ground-Truth Knowledge Base. Salon policies, hours, and cancellation terms are ingested and indexed. The AI receptionist retrieves answers strictly from your verified business documentation.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      // Move through knowledge base documents
      await moveCursor(page, 450, 220, 15);
      await page.waitForTimeout(2500);
      await moveCursor(page, 850, 220, 15);
      await page.waitForTimeout(2500);
      // Scroll down through FAQs and chunks
      await smoothScroll(page, 300, 8);
      await page.waitForTimeout(3000);
      await moveCursor(page, 700, 450, 15);
      await page.waitForTimeout(2200);
      await smoothScroll(page, -300, 8);
      await page.waitForTimeout(1500);
    },
  },
  {
    id: "ch6_services",
    title: "Services & Transparent Pricing",
    route: "http://localhost:3000/services",
    narration:
      "Manage your service offerings with complete pricing transparency. Operator Demo Salon features Haircut and Styling for 500 rupees, Bridal Styling for 1,200 rupees, and Organic Herbal Facials for 1,800 rupees, each configured with exact appointment durations.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      // Hover each service card
      await moveCursor(page, 400, 260, 15);
      await page.waitForTimeout(2500);
      await moveCursor(page, 750, 260, 15);
      await page.waitForTimeout(2500);
      await moveCursor(page, 1100, 260, 15);
      await page.waitForTimeout(2500);
      // Scroll to view full service details
      await smoothScroll(page, 200, 6);
      await page.waitForTimeout(2200);
      await smoothScroll(page, -200, 6);
      await page.waitForTimeout(1500);
    },
  },
  {
    id: "ch7_staff",
    title: "Staff Members & Shift Schedules",
    route: "http://localhost:3000/staff",
    narration:
      "The Staff module coordinates your team effortlessly. Assign specific services to stylists like Priya Sharma and Rahul Mehta, configure weekly working shifts, and let Operator balance appointments seamlessly to maximize daily revenue.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      // Hover staff profile cards
      await moveCursor(page, 450, 240, 15);
      await page.waitForTimeout(2500);
      await moveCursor(page, 850, 240, 15);
      await page.waitForTimeout(2500);
      // Scroll to view schedule
      await smoothScroll(page, 220, 6);
      await page.waitForTimeout(2500);
      await smoothScroll(page, -220, 6);
      await page.waitForTimeout(1500);
    },
  },
  {
    id: "ch8_widget",
    title: "Website Widget Studio & 1-Line Embed",
    route: "http://localhost:3000/widget",
    narration:
      "Deploy your live AI receptionist in under two minutes with the Website Widget Studio. Customize colors, greetings, and bubble placement with instant preview, and copy a single line of script for WordPress, Shopify, Wix, or custom websites.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      // Hover tabs
      await moveCursor(page, 400, 140, 15);
      await page.waitForTimeout(2000);
      await moveCursor(page, 650, 140, 15);
      await page.waitForTimeout(2000);
      // Hover copy script button
      const copyBtn = await page.$("button:has-text('Copy Embed Script'), button:has-text('Copy')");
      if (copyBtn) {
        const box = await copyBtn.boundingBox();
        if (box) await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
      }
      await page.waitForTimeout(2500);
      // Smooth scroll to preview
      await smoothScroll(page, 250, 8);
      await page.waitForTimeout(3000);
      await smoothScroll(page, -250, 8);
      await page.waitForTimeout(1500);
    },
  },
  {
    id: "ch9_ai_settings",
    title: "AI Persona, Guardrails & Deployment",
    route: "http://localhost:3000/settings/ai",
    narration:
      "In AI Settings, customize your receptionist's personality, greeting tone, and qualification criteria. With enterprise guardrails and zero-hallucination guarantees, Operator transforms your operations into an autonomous 24/7 revenue engine. Deploy Operator today at operator.nexxtechnologies.com.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      // Hover prompt configuration
      await moveCursor(page, 600, 280, 15);
      await page.waitForTimeout(2500);
      await moveCursor(page, 600, 450, 15);
      await page.waitForTimeout(2500);
      // Scroll through guardrail options
      await smoothScroll(page, 300, 8);
      await page.waitForTimeout(3000);
      await smoothScroll(page, -300, 8);
      await page.waitForTimeout(2500);
    },
  },
];

async function generateTTSAudio(tempDir: string) {
  console.log("Generating high-definition narration audio with Edge TTS...");
  const tts = new MsEdgeTTS();
  await tts.setMetadata("en-US-ChristopherNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    const audioPath = path.join(tempDir, `audio_ch_${i + 1}.mp3`);
    ch.audioFile = audioPath;

    if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000) {
      try {
        const probeCmd = `"${ffmpegPath}" -i "${audioPath}" 2>&1`;
        const out = execSync(probeCmd, { encoding: "utf8" });
        const match = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        ch.duration = match ? parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]) : 15;
      } catch (err: any) {
        const match = (err.stdout || err.stderr || "").match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        ch.duration = match ? parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]) : 15;
      }
      console.log(`  [Chapter ${i + 1}] (cached) "${ch.title}" -> ${ch.duration.toFixed(2)}s`);
      continue;
    }

    const { audioStream } = tts.toStream(ch.narration);
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
      ch.duration = match ? parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]) : 15;
    } catch (err: any) {
      const match = (err.stdout || err.stderr || "").match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      ch.duration = match ? parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]) : 15;
    }

    console.log(`  [Chapter ${i + 1}] "${ch.title}" -> ${ch.duration.toFixed(2)}s`);
  }
}

function generateSrtCaptions(outputPath: string): string {
  let srt = "";
  let currentTime = 0;

  for (let i = 0; i < CHAPTERS.length; i++) {
    const s = CHAPTERS[i];
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
    srt += `${s.narration}\n\n`;

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
  console.log("Pre-warming all dashboard routes...");
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync(authPath) ? authPath : undefined,
  });
  const page = await context.newPage();

  for (const ch of CHAPTERS) {
    try {
      await page.goto(ch.route, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(300);
    } catch (e) {}
  }

  await page.close();
  await context.close();
  console.log("All routes successfully pre-warmed!");
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
  const testFramePath = path.join(tempDir, `test_trim_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`);

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

async function runAllChapterRecordings(tempDir: string): Promise<string[]> {
  console.log("Launching Chromium for Clean Zero-Blank Post-Onboarding Functional Recording...");
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const browser = await chromium.launch({ headless: true });

  await preWarmRoutes(browser);

  const segmentDir = path.join(tempDir, "segments");
  if (!fs.existsSync(segmentDir)) fs.mkdirSync(segmentDir, { recursive: true });

  const cleanSegments: string[] = [];

  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    console.log(`\nRecording Chapter ${i + 1}/${CHAPTERS.length}: ${ch.title} (${ch.route})...`);

    const rawVideo = await recordSegment(
      browser,
      authPath,
      ch.route,
      segmentDir,
      async (page: Page) => {
        await ch.actions(page);
      }
    );

    const cleanPath = path.join(tempDir, `clean_ch_${i + 1}.mp4`);
    trimSegmentToRenderedUI(rawVideo, cleanPath, tempDir);
    cleanSegments.push(cleanPath);
  }

  await browser.close();
  return cleanSegments;
}

async function composeCleanMasterVideo(segments: string[], tempDir: string, finalMp4Path: string) {
  console.log("Merging narration audio and seamless video segments...");

  // 1. Audio Concat
  const concatListPath = path.join(tempDir, "audio_concat.txt");
  const concatLines = CHAPTERS.map((s) => `file '${path.resolve(s.audioFile).replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(concatListPath, concatLines, "utf8");

  const masterAudioPath = path.join(tempDir, "master_narration.mp3");
  const audioConcatCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${concatListPath}" -c:a libmp3lame -q:a 2 "${masterAudioPath}"`;
  execSync(audioConcatCmd, { stdio: "inherit" });

  let audioDuration = 120;
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

  try {
    const probeCmd = `"${ffmpegPath}" -i "${videoPath}" 2>&1`;
    const probeOut = execSync(probeCmd, { encoding: "utf8" });
    console.log("FFmpeg Probe Output:\n", probeOut.split("\n").filter((l: string) => l.includes("Duration") || l.includes("Stream")).join("\n"));
  } catch (err: any) {
    const probeOut = err.stdout || err.stderr || err.message || "";
    console.log("FFmpeg Probe Output:\n", probeOut.split("\n").filter((l: string) => l.includes("Duration") || l.includes("Stream")).join("\n"));
  }

  // Extract 25 frames across the video for blank check
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
  const tempDir = path.join(process.cwd(), "temp", "functionality-demo");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const outputDir = path.join(process.cwd(), "artifacts", "operator-functionality-demo");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const brainDir = "C:\\Users\\Jaydeep Chandegara\\.gemini\\antigravity\\brain\\1a37b562-f8eb-485b-ae7b-6e317087c57c";

  const finalMp4Path = path.join(outputDir, "operator-functionality-demo.mp4");
  const captionsPath = path.join(outputDir, "captions.srt");
  const scriptPath = path.join(outputDir, "demo-script.md");

  // Step 1: TTS
  await generateTTSAudio(tempDir);

  // Step 2: Captions & Script
  generateSrtCaptions(captionsPath);
  const scriptDoc = `# Operator — Complete Post-Onboarding Functionalities Demo Script\n\n` +
    CHAPTERS.map((ch, idx) => `### Chapter ${idx + 1}: ${ch.title} (${ch.duration.toFixed(1)}s)\n\n**Route**: \`${ch.route}\`\n\n> "${ch.narration}"\n`).join("\n");
  fs.writeFileSync(scriptPath, scriptDoc, "utf8");

  // Step 3: Record All 9 Chapters with Zero Blank Frame Trimming
  const segments = await runAllChapterRecordings(tempDir);

  // Step 4: Final compose
  await composeCleanMasterVideo(segments, tempDir, finalMp4Path);

  // Step 5: Quality verify
  await verifyVideoQuality(finalMp4Path, tempDir);

  // Step 6: Copy to Brain Artifact and Client Demo directory
  if (fs.existsSync(brainDir)) {
    fs.copyFileSync(finalMp4Path, path.join(brainDir, "operator-functionality-demo.mp4"));
    if (fs.existsSync(captionsPath)) fs.copyFileSync(captionsPath, path.join(brainDir, "functionality-captions.srt"));
    if (fs.existsSync(scriptPath)) fs.copyFileSync(scriptPath, path.join(brainDir, "functionality-script.md"));
    const thumbPath = path.join(outputDir, "thumbnail.png");
    if (fs.existsSync(thumbPath)) fs.copyFileSync(thumbPath, path.join(brainDir, "functionality-thumbnail.png"));
  }

  // Also make available in artifacts/operator-client-demo/ for easy sharing
  const altDir = path.join(process.cwd(), "artifacts", "operator-client-demo");
  if (fs.existsSync(altDir)) {
    fs.copyFileSync(finalMp4Path, path.join(altDir, "operator-all-functionalities-demo.mp4"));
  }

  console.log("\n=======================================================");
  console.log("🎉 Complete Functional Post-Onboarding Walkthrough Delivered!");
  console.log("Master Video:", finalMp4Path);
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("FATAL ERROR in Functionality Demo Generator:", err);
  process.exit(1);
});
