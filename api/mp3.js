import { spawn } from "child_process";
import path from "path";

export const config = { api: { responseLimit: false } };

export default function handler(req, res) {
    const url = req.query.url;
    if (!url) return res.status(400).send("Missing url");

    try {
        // yt-dlp via spawn, compatible serverless Vercel
        const ytdlp = spawn("yt-dlp", [
            "-f",
            "bestaudio[ext=m4a]",
            "-o",
            "-", // stdout
            "--no-playlist",
            url,
        ]);

        const ffmpeg = spawn("ffmpeg", [
            "-i",
            "pipe:0",
            "-vn",
            "-ab",
            "192k",
            "-f",
            "mp3",
            "pipe:1",
        ]);

        ytdlp.stdout.pipe(ffmpeg.stdin);

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");

        ffmpeg.stdout.pipe(res);

        // logs pour debug
        ffmpeg.stderr.on("data", (d) => console.log("ffmpeg:", d.toString()));
        ytdlp.stderr.on("data", (d) => console.log("yt-dlp:", d.toString()));

        ytdlp.on("error", (e) => {
            console.error("yt-dlp failed:", e);
            res.status(500).send("yt-dlp failed");
        });

        ffmpeg.on("error", (e) => {
            console.error("ffmpeg failed:", e);
            res.status(500).send("ffmpeg failed");
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Download failed");
    }
}
