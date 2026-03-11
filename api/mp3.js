import { spawn } from "child_process";
import path from "path";

export const config = {
    api: { responseLimit: false },
};

export default function handler(req, res) {
    const url = req.query.url;
    if (!url) return res.status(400).send("Missing url parameter");

    const ytdlpPath = path.join(process.cwd(), "bin", "yt-dlp");
    const ffmpegPath = path.join(process.cwd(), "bin", "ffmpeg");

    // yt-dlp → flux audio m4a
    const ytdlp = spawn(ytdlpPath, [
        "-f",
        "bestaudio[ext=m4a]",
        "-o",
        "-",
        "--no-playlist",
        url,
    ]);

    ytdlp.stderr.on("data", (d) => console.log("yt-dlp:", d.toString()));

    ytdlp.on("error", (e) => {
        console.error("yt-dlp failed:", e);
        res.status(500).send("yt-dlp failed");
    });

    // ffmpeg → conversion mp3
    const ffmpeg = spawn(ffmpegPath, [
        "-i",
        "pipe:0",
        "-vn",
        "-ab",
        "192k",
        "-f",
        "mp3",
        "pipe:1",
    ]);

    ffmpeg.stderr.on("data", (d) => console.log("ffmpeg:", d.toString()));
    ffmpeg.on("error", (e) => {
        console.error("ffmpeg failed:", e);
        res.status(500).send("ffmpeg failed");
    });

    // Headers pour téléchargement
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");

    // Pipeline direct
    ytdlp.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(res);
}
