import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { extname } from "path";

export interface StoredFile {
  key: string;
  url: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly r2: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly localDir: string;
  private readonly localPublicBase: string;

  constructor(private readonly cfg: ConfigService) {
    const accountId = cfg.get<string>("R2_ACCOUNT_ID");
    const accessKeyId = cfg.get<string>("R2_ACCESS_KEY_ID");
    const secretAccessKey = cfg.get<string>("R2_SECRET_ACCESS_KEY");
    this.bucket = cfg.get<string>("R2_BUCKET") ?? "";
    this.publicUrl = (cfg.get<string>("R2_PUBLIC_URL") ?? "").replace(/\/$/, "");

    if (accountId && accessKeyId && secretAccessKey && this.bucket && this.publicUrl) {
      this.r2 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`R2 storage enabled (bucket: ${this.bucket})`);
    } else {
      this.r2 = null;
      this.logger.warn("R2 not configured — falling back to local disk storage");
    }

    this.localDir = join(process.cwd(), cfg.get<string>("UPLOAD_DIR") ?? "./uploads");
    this.localPublicBase = (cfg.get<string>("PUBLIC_URL") ?? "").replace(/\/$/, "");
  }

  async upload(
    file: Express.Multer.File,
    options: { prefix?: string } = {},
  ): Promise<StoredFile> {
    const ext = extname(file.originalname) || "";
    const safePrefix = options.prefix ?? "upload";
    const key = `${safePrefix}-${randomUUID()}${ext}`;

    if (this.r2) {
      await this.r2.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      return { key, url: `${this.publicUrl}/${key}` };
    }

    await fs.mkdir(this.localDir, { recursive: true });
    await fs.writeFile(join(this.localDir, key), file.buffer);
    return { key, url: `${this.localPublicBase}/uploads/${key}` };
  }

  async delete(urlOrKey: string | null | undefined): Promise<void> {
    if (!urlOrKey) return;
    const key = this.extractKey(urlOrKey);
    if (!key) return;

    if (this.r2) {
      try {
        await this.r2.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } catch (err) {
        this.logger.warn(`R2 delete failed for ${key}: ${(err as Error).message}`);
      }
      return;
    }

    try {
      await fs.unlink(join(this.localDir, key));
    } catch {
      // file already gone — ignore
    }
  }

  private extractKey(urlOrKey: string): string | null {
    if (!urlOrKey) return null;
    if (this.r2 && this.publicUrl && urlOrKey.startsWith(this.publicUrl)) {
      return urlOrKey.slice(this.publicUrl.length + 1);
    }
    const uploadsIdx = urlOrKey.indexOf("/uploads/");
    if (uploadsIdx >= 0) return urlOrKey.slice(uploadsIdx + "/uploads/".length);
    if (!urlOrKey.includes("/")) return urlOrKey;
    return urlOrKey.split("/").pop() ?? null;
  }
}
