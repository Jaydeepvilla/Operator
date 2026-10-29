import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import * as fs from "fs";
import { execSync } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const ffmpegPath = ffmpegInstaller.path;

export async function synthesizeNarration(text: string, outputPath: string): Promise<number> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata("en-US-ChristopherNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const { audioStream } = tts.toStream(text);
  const writeStream = fs.createWriteStream(outputPath);

  await new Promise((resolve, reject) => {
    audioStream.pipe(writeStream);
    writeStream.on("finish", () => resolve(true));
    writeStream.on("error", reject);
  });

  // Get audio duration using ffmpeg
  try {
    const cmd = `"${ffmpegPath}" -i "${outputPath}" 2>&1`;
    const output = execSync(cmd, { encoding: "utf8" });
    const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (match) {
      const hours = parseFloat(match[1]);
      const minutes = parseFloat(match[2]);
      const seconds = parseFloat(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }
  } catch (err: any) {
    const output = err.stdout || err.stderr || err.message || "";
    const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (match) {
      const hours = parseFloat(match[1]);
      const minutes = parseFloat(match[2]);
      const seconds = parseFloat(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  return 12.0; // safe fallback
}

