import fs from "fs/promises";
import path from "path";

export interface FileUploadResult {
  filePath: string;
  fileSize: number;
  fileType: string;
  url: string;
}

export interface StorageProvider {
  uploadFile(file: { name: string; size: number; type: string; buffer: Buffer }, organizationId: string): Promise<FileUploadResult>;
  deleteFile(filePath: string): Promise<void>;
}

export class LocalStorageService implements StorageProvider {
  async uploadFile(
    file: { name: string; size: number; type: string; buffer: Buffer },
    organizationId: string
  ): Promise<FileUploadResult> {
    const fileExtension = file.name.split(".").pop() || "txt";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
    
    // Storing files under public/uploads so they are served statically by Next.js
    const relativeDir = path.join("uploads", organizationId);
    const publicDir = path.join(process.cwd(), "public", relativeDir);
    const absoluteFilePath = path.join(publicDir, uniqueName);
    const relativeFilePath = path.join(relativeDir, uniqueName).replace(/\\/g, "/");

    // Ensure the output directory exists
    await fs.mkdir(publicDir, { recursive: true });

    // Write file to disk
    await fs.writeFile(absoluteFilePath, file.buffer);

    // Resolve base URL from host env or fallback to local path
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const url = `${appUrl}/${relativeFilePath}`;

    return {
      filePath: relativeFilePath,
      fileSize: file.size,
      fileType: fileExtension.toLowerCase(),
      url,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const absoluteFilePath = path.join(process.cwd(), "public", filePath);
      await fs.unlink(absoluteFilePath);
    } catch (e) {
      console.error("[StorageService] Failed to delete file:", e);
    }
  }
}

export const storageService = new LocalStorageService();
