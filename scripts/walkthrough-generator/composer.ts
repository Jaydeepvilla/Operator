import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const ffmpegPath = ffmpegInstaller.path;

export class WalkthroughComposer {
  /**
   * Builds an individual chapter clip from frames and narration audio.
   */
  async buildChapterClip(
    frames: string[],
    audioPath: string,
    duration: number,
    outputPath: string
  ): Promise<void> {
    const totalDuration = Math.max(duration + 1.2, 5); // Add comfortable 1.2s padding
    const halfDuration = totalDuration / Math.max(frames.length, 1);

    if (frames.length === 1) {
      const cmd = `"${ffmpegPath}" -y -loop 1 -t ${totalDuration.toFixed(2)} -i "${frames[0]}" -i "${audioPath}" -c:v libx264 -tune stillimage -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${outputPath}"`;
      execSync(cmd, { stdio: "pipe" });
    } else {
      // 2 frames: split time equally
      const frame1Duration = halfDuration.toFixed(2);
      const frame2Duration = (totalDuration - halfDuration).toFixed(2);

      const filter = `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v0];[1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v1];[v0][v1]concat=n=2:v=1:a=0[v]`;

      const cmd = `"${ffmpegPath}" -y -loop 1 -t ${frame1Duration} -i "${frames[0]}" -loop 1 -t ${frame2Duration} -i "${frames[1]}" -i "${audioPath}" -filter_complex "${filter}" -map "[v]" -map 2:a -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${outputPath}"`;
      execSync(cmd, { stdio: "pipe" });
    }
  }

  /**
   * Seamlessly concatenates all chapter clips using the FFmpeg concat demuxer.
   */
  async concatenateClips(clipPaths: string[], finalOutputPath: string): Promise<void> {
    const tempDir = path.dirname(finalOutputPath);
    const concatListPath = path.join(tempDir, "concat_list.txt");

    const fileLines = clipPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    fs.writeFileSync(concatListPath, fileLines, "utf8");

    const cmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${concatListPath}" -c copy "${finalOutputPath}"`;
    execSync(cmd, { stdio: "pipe" });
  }

  /**
   * Verifies the generated video using FFmpeg inspection.
   */
  verifyVideo(videoPath: string): { duration: number; width: number; height: number; valid: boolean } {
    try {
      const cmd = `"${ffmpegPath}" -i "${videoPath}" 2>&1`;
      const output = execSync(cmd, { encoding: "utf8" });

      const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      const resMatch = output.match(/(\d{3,4})x(\d{3,4})/);

      let duration = 0;
      if (durationMatch) {
        duration =
          parseFloat(durationMatch[1]) * 3600 +
          parseFloat(durationMatch[2]) * 60 +
          parseFloat(durationMatch[3]);
      }

      const width = resMatch ? parseInt(resMatch[1], 10) : 0;
      const height = resMatch ? parseInt(resMatch[2], 10) : 0;

      return {
        duration,
        width,
        height,
        valid: duration > 0 && fs.existsSync(videoPath) && fs.statSync(videoPath).size > 100000,
      };
    } catch (err: any) {
      const output = err.stdout || err.stderr || err.message || "";
      const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      const resMatch = output.match(/(\d{3,4})x(\d{3,4})/);

      let duration = 0;
      if (durationMatch) {
        duration =
          parseFloat(durationMatch[1]) * 3600 +
          parseFloat(durationMatch[2]) * 60 +
          parseFloat(durationMatch[3]);
      }

      const width = resMatch ? parseInt(resMatch[1], 10) : 0;
      const height = resMatch ? parseInt(resMatch[2], 10) : 0;

      return {
        duration,
        width,
        height,
        valid: duration > 0 && fs.existsSync(videoPath) && fs.statSync(videoPath).size > 100000,
      };
    }
  }
}

