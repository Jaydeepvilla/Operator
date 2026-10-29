import { chromium, Browser, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const ffmpegPath = ffmpegInstaller.path;

interface ShowcaseChapter {
  id: string;
  title: string;
  route: string;
  narration: string;
  audioFile: string;
  duration: number;
  useAuth?: boolean;
  actions: (page: Page) => Promise<void>;
}

const SHOWCASE_CHAPTERS: ShowcaseChapter[] = [
  {
    id: "auth1_signup",
    title: "Enterprise Account Registration",
    route: "http://localhost:3000/sign-up",
    useAuth: false,
    narration:
      "Welcome to Operator. Setting up a new business account takes less than a minute. First, enter your first and last name. Next, provide your official business email address. When creating your password, Operator performs real-time security strength analysis, verifying length, uppercase characters, numbers, and symbols to ensure your business data is protected. Confirm your password, review terms, and click Continue to register your workspace.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      await page.waitForTimeout(1000);

      // Move to First Name and type
      const fnInput = await page.$("#signup-firstname");
      if (fnInput) {
        const box = await fnInput.boundingBox();
        if (box) await clickCursor(page, box.x + 80, box.y + box.height / 2);
        for (const c of "Jaydeep") {
          await page.keyboard.type(c, { delay: 45 });
        }
      }
      await page.waitForTimeout(600);

      // Move to Last Name and type
      const lnInput = await page.$("#signup-lastname");
      if (lnInput) {
        const box = await lnInput.boundingBox();
        if (box) await clickCursor(page, box.x + 80, box.y + box.height / 2);
        for (const c of "Chandegara") {
          await page.keyboard.type(c, { delay: 45 });
        }
      }
      await page.waitForTimeout(600);

      // Move to Email and type
      const emInput = await page.$("#signup-email");
      if (emInput) {
        const box = await emInput.boundingBox();
        if (box) await clickCursor(page, box.x + 80, box.y + box.height / 2);
        for (const c of "jaydeep@operatordemosalon.com") {
          await page.keyboard.type(c, { delay: 35 });
        }
      }
      await page.waitForTimeout(800);

      // Move to Password and type
      const pwInput = await page.$("#signup-password");
      if (pwInput) {
        const box = await pwInput.boundingBox();
        if (box) await clickCursor(page, box.x + 80, box.y + box.height / 2);
        for (const c of "SecureOperator2026!") {
          await page.keyboard.type(c, { delay: 40 });
        }
      }
      await page.waitForTimeout(1200);

      // Move cursor to Password Strength indicator
      await moveCursor(page, 960, 520, 15);
      await page.waitForTimeout(1500);

      // Move to Confirm Password and type
      const cpInput = await page.$("#signup-confirm");
      if (cpInput) {
        const box = await cpInput.boundingBox();
        if (box) await clickCursor(page, box.x + 80, box.y + box.height / 2);
        for (const c of "SecureOperator2026!") {
          await page.keyboard.type(c, { delay: 40 });
        }
      }
      await page.waitForTimeout(1000);

      // Move cursor to Terms notice
      await moveCursor(page, 960, 680, 15);
      await page.waitForTimeout(1200);

      // Hover over Continue button
      const submitBtn = await page.$("button[type='submit']");
      if (submitBtn) {
        const box = await submitBtn.boundingBox();
        if (box) await moveCursor(page, box.x + box.width / 2, box.y + box.height / 2, 12);
      }
      await page.waitForTimeout(2500);
    },
  },
  {
    id: "auth2_signin",
    title: "Secure Sign-In & Credential Management",
    route: "http://localhost:3000/sign-in",
    useAuth: false,
    narration:
      "For returning business owners and team members, Operator offers a streamlined and hardened login experience. Simply enter your registered email address and password. You can toggle credential visibility using the eye icon to verify accuracy before signing in. Check Remember me to keep your management session active across your devices, then click Continue. Operator verifies your credentials securely and authenticates your session.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      await page.waitForTimeout(1000);

      // Move to Email and type
      const emInput = await page.$("#signin-email");
      if (emInput) {
        const box = await emInput.boundingBox();
        if (box) await clickCursor(page, box.x + 80, box.y + box.height / 2);
        for (const c of "jaydeep.chandegara94@gmail.com") {
          await page.keyboard.type(c, { delay: 35 });
        }
      }
      await page.waitForTimeout(600);

      // Move to Password and type
      const pwInput = await page.$("#signin-password");
      if (pwInput) {
        const box = await pwInput.boundingBox();
        if (box) await clickCursor(page, box.x + 80, box.y + box.height / 2);
        for (const c of "SecureOperator2026!") {
          await page.keyboard.type(c, { delay: 40 });
        }
      }
      await page.waitForTimeout(800);

      // Toggle password visibility (show)
      const toggleBtn = await page.$("button[aria-label*='password'], button[aria-label*='Password']");
      if (toggleBtn) {
        const box = await toggleBtn.boundingBox();
        if (box) {
          await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(1400);
          // Toggle back (hide)
          await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
        }
      }
      await page.waitForTimeout(800);

      // Toggle Remember me
      const rememberCheckbox = await page.$("label[for='signin-remember'], #signin-remember");
      if (rememberCheckbox) {
        const box = await rememberCheckbox.boundingBox();
        if (box) await clickCursor(page, box.x + 12, box.y + box.height / 2);
      }
      await page.waitForTimeout(1000);

      // Click Continue button
      const submitBtn = await page.$("button[type='submit']");
      if (submitBtn) {
        const box = await submitBtn.boundingBox();
        if (box) await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
      }

      // Wait to observe button state change & smooth transition
      await page.waitForTimeout(3000);
    },
  },
  {
    id: "auth3_forgot",
    title: "Self-Service Password Recovery",
    route: "http://localhost:3000/forgot-password",
    useAuth: false,
    narration:
      "If you or a staff member ever forget your password, Operator provides an instant self-service recovery process. Simply navigate to Forgot Password, enter your registered business email address, and click Send reset link. Operator immediately generates a secure, time-limited cryptographic reset link and confirms delivery to your inbox, allowing you to regain access without administrator intervention.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      await page.waitForTimeout(1000);

      // Move to Email and type
      const emInput = await page.$("#forgot-email");
      if (emInput) {
        const box = await emInput.boundingBox();
        if (box) await clickCursor(page, box.x + 80, box.y + box.height / 2);
        for (const c of "jaydeep.chandegara94@gmail.com") {
          await page.keyboard.type(c, { delay: 35 });
        }
      }
      await page.waitForTimeout(800);

      // Click Send reset link
      const submitBtn = await page.$("button[type='submit']");
      if (submitBtn) {
        const box = await submitBtn.boundingBox();
        if (box) await clickCursor(page, box.x + box.width / 2, box.y + box.height / 2);
      }

      // Wait for success checkmark screen to appear
      try {
        await page.waitForSelector("h2:has-text('Check your inbox')", { timeout: 10000 });
      } catch (e) {
        await page.waitForTimeout(3000);
      }

      await page.waitForTimeout(1500);

      // Move cursor over confirmation checkmark and heading
      await moveCursor(page, 960, 480, 15);
      await page.waitForTimeout(2000);

      // Move cursor over "← Back to sign in"
      const backLink = await page.$("a:has-text('Back to sign in')");
      if (backLink) {
        const box = await backLink.boundingBox();
        if (box) await moveCursor(page, box.x + box.width / 2, box.y + box.height / 2, 12);
      }
      await page.waitForTimeout(2500);
    },
  },
  {
    id: "auth4_dashboard",
    title: "Authenticated Workspace Command Center",
    route: "http://localhost:3000/dashboard",
    useAuth: true,
    narration:
      "Once signed in, you are immediately routed to your live business operations dashboard. In the top navigation, you can verify your authenticated user profile and active business workspace — Operator Demo Salon. Here, Operator AI Receptionist remains continuously active twenty-four-seven, ready to answer client calls, answer inquiries, and schedule appointments in real time. Your account setup and access management are now complete and fully operational.",
    audioFile: "",
    duration: 0,
    actions: async (page: Page) => {
      await page.waitForTimeout(1200);

      // Highlight active organization badge
      await moveCursor(page, 220, 48, 15);
      await page.waitForTimeout(2000);

      // Highlight live 24/7 AI Receptionist status indicator
      await moveCursor(page, 620, 80, 15);
      await page.waitForTimeout(2500);

      // Sweep across live KPI metric cards
      await moveCursor(page, 450, 200, 15);
      await page.waitForTimeout(2000);
      await moveCursor(page, 850, 200, 15);
      await page.waitForTimeout(2000);
      await moveCursor(page, 1250, 200, 15);
      await page.waitForTimeout(2000);

      // Smooth scroll down to overview actions
      await smoothScroll(page, 240, 8);
      await page.waitForTimeout(2000);

      // Center cursor and hold smoothly
      await moveCursor(page, 960, 520, 15);
      await page.waitForTimeout(3000);
    },
  },
];

async function generateTTSAudio(tempDir: string) {
  console.log("Generating high-definition narration audio with Edge TTS...");
  const tts = new MsEdgeTTS();
  await tts.setMetadata("en-US-ChristopherNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  for (let i = 0; i < SHOWCASE_CHAPTERS.length; i++) {
    const ch = SHOWCASE_CHAPTERS[i];
    const audioPath = path.join(tempDir, `audio_auth_${i + 1}.mp3`);
    ch.audioFile = audioPath;

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
      ch.duration = match ? parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]) : 24;
    } catch (err: any) {
      const match = (err.stdout || err.stderr || "").match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      ch.duration = match ? parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]) : 24;
    }

    console.log(`  [Chapter ${i + 1}] "${ch.title}" -> ${ch.duration.toFixed(2)}s`);
  }
}

function generateSrtCaptions(outputPath: string): string {
  let srt = "";
  let currentTime = 0;

  for (let i = 0; i < SHOWCASE_CHAPTERS.length; i++) {
    const s = SHOWCASE_CHAPTERS[i];
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
  console.log("Pre-warming all showcase routes...");
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync(authPath) ? authPath : undefined,
  });
  const page = await context.newPage();

  for (const ch of SHOWCASE_CHAPTERS) {
    try {
      await page.goto(ch.route, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(400);
    } catch (e) {}
  }

  await page.close();
  await context.close();
  console.log("All showcase routes successfully pre-warmed!");
}

async function recordSegment(
  browser: Browser,
  authPath: string,
  targetUrl: string,
  useAuth: boolean,
  outDir: string,
  actionFn: (page: Page) => Promise<void>
): Promise<string> {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: useAuth && fs.existsSync(authPath) ? authPath : undefined,
    recordVideo: {
      dir: outDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(800);
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
  console.log("Launching Chromium for Clean Zero-Blank Showcase Recording...");
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const browser = await chromium.launch({ headless: true });

  await preWarmRoutes(browser);

  const segmentDir = path.join(tempDir, "segments");
  if (!fs.existsSync(segmentDir)) fs.mkdirSync(segmentDir, { recursive: true });

  const cleanSegments: string[] = [];

  for (let i = 0; i < SHOWCASE_CHAPTERS.length; i++) {
    const ch = SHOWCASE_CHAPTERS[i];
    console.log(`\nRecording Showcase Chapter ${i + 1}/${SHOWCASE_CHAPTERS.length}: ${ch.title} (${ch.route})...`);

    const rawVideo = await recordSegment(
      browser,
      authPath,
      ch.route,
      !!ch.useAuth,
      segmentDir,
      async (page: Page) => {
        await ch.actions(page);
      }
    );

    const cleanPath = path.join(tempDir, `clean_showcase_${i + 1}.mp4`);
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
  const concatLines = SHOWCASE_CHAPTERS.map((s) => `file '${path.resolve(s.audioFile).replace(/\\/g, "/")}'`).join("\n");
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

  try {
    const probeCmd = `"${ffmpegPath}" -i "${videoPath}" 2>&1`;
    const probeOut = execSync(probeCmd, { encoding: "utf8" });
    console.log("FFmpeg Probe Output:\n", probeOut.split("\n").filter((l: string) => l.includes("Duration") || l.includes("Stream")).join("\n"));
  } catch (err: any) {
    const probeOut = err.stdout || err.stderr || err.message || "";
    console.log("FFmpeg Probe Output:\n", probeOut.split("\n").filter((l: string) => l.includes("Duration") || l.includes("Stream")).join("\n"));
  }

  // Extract 20 frames across the video for blank check
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
  if (frames.length > 2) {
    const chosenFrame = path.join(framesDir, frames[Math.floor(frames.length / 2)]);
    fs.copyFileSync(chosenFrame, thumbPath);
    console.log("Generated thumbnail:", thumbPath);
  }
}

async function main() {
  const tempDir = path.join(process.cwd(), "temp", "auth-showcase");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const outputDir = path.join(process.cwd(), "artifacts", "account-creation-and-login");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const brainDir = "C:\\Users\\Jaydeep Chandegara\\.gemini\\antigravity\\brain\\1a37b562-f8eb-485b-ae7b-6e317087c57c";

  const finalMp4Path = path.join(outputDir, "account-creation-and-login.mp4");
  const captionsPath = path.join(outputDir, "captions.srt");
  const scriptPath = path.join(outputDir, "demo-script.md");

  // Step 1: TTS Generation
  await generateTTSAudio(tempDir);

  // Step 2: Captions & Script Document
  generateSrtCaptions(captionsPath);
  const scriptDoc = `# Account Creation & Login — Product Showcase Script\n\n` +
    SHOWCASE_CHAPTERS.map((ch, idx) => `### Chapter ${idx + 1}: ${ch.title} (${ch.duration.toFixed(1)}s)\n\n**Route**: \`${ch.route}\`\n\n> "${ch.narration}"\n`).join("\n");
  fs.writeFileSync(scriptPath, scriptDoc, "utf8");

  // Step 3: Record All Chapters with Real UI Actions & Zero Blank Frames
  const segments = await runAllChapterRecordings(tempDir);

  // Step 4: Final Composition
  await composeCleanMasterVideo(segments, tempDir, finalMp4Path);

  // Step 5: Quality Gate Verification
  await verifyVideoQuality(finalMp4Path, tempDir);

  // Step 6: Copy to Brain Artifact and Client Demo directory
  if (fs.existsSync(brainDir)) {
    fs.copyFileSync(finalMp4Path, path.join(brainDir, "account-creation-and-login.mp4"));
    if (fs.existsSync(captionsPath)) fs.copyFileSync(captionsPath, path.join(brainDir, "auth-captions.srt"));
    if (fs.existsSync(scriptPath)) fs.copyFileSync(scriptPath, path.join(brainDir, "auth-script.md"));
    const thumbPath = path.join(outputDir, "thumbnail.png");
    if (fs.existsSync(thumbPath)) fs.copyFileSync(thumbPath, path.join(brainDir, "auth-thumbnail.png"));
  }

  // Also copy to artifacts/operator-client-demo/ for unified client distribution
  const altDir = path.join(process.cwd(), "artifacts", "operator-client-demo");
  if (fs.existsSync(altDir)) {
    fs.copyFileSync(finalMp4Path, path.join(altDir, "account-creation-and-login.mp4"));
  }

  console.log("\n=======================================================");
  console.log("🎉 Complete Product Showcase 'Account Creation & Login' Delivered!");
  console.log("Master Video:", finalMp4Path);
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("FATAL ERROR in Auth Showcase Generator:", err);
  process.exit(1);
});

