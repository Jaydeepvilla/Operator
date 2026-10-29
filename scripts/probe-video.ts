import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync } from "child_process";

const ffmpeg = ffmpegInstaller.path;
try {
  const info = execSync(`"${ffmpeg}" -i artifacts/operator-client-demo/operator-client-demo.mp4 2>&1`, { encoding: "utf8" });
  console.log(info.split("\n").filter(l => l.includes("Duration") || l.includes("Video") || l.includes("Audio")).join("\n"));
} catch (e: any) {
  const output = e.stdout || e.stderr || e.message || "";
  console.log(output.split("\n").filter((l: string) => l.includes("Duration") || l.includes("Video") || l.includes("Audio")).join("\n"));
}

