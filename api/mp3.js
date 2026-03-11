import { spawn } from "child_process";
import path from "path";

export const config = {
    api: { responseLimit: false },
};

export default function handler(req, res) {
    const url = req.query.url;

    if (!url) {
        res.status(400).send("Missing url");
        return;
    }

    const ytdlpPath = path.join(process.cwd(), "bin", "yt-dlp");
    const ffmpegPath = path.join(process.cwd(), "bin", "ffmpeg");

    const ytdlp = spawn(ytdlpPath, [
        "-f",
        "bestaudio",
        "-o",
        "-",
        "--no-playlist",
        url,
    ]);

    const ffmpeg = spawn(ffmpegPath, [
        "-i",
        "pipe:0",
        "-vn",
        "-f",
        "mp3",
        "pipe:1",
    ]);

    ytdlp.stderr.on("data", (d) => console.log("yt-dlp:", d.toString()));
    ffmpeg.stderr.on("data", (d) => console.log("ffmpeg:", d.toString()));

    ytdlp.on("error", (e) => {
        console.error(e);
        res.status(500).send("yt-dlp failed");
    });

    ffmpeg.on("error", (e) => {
        console.error(e);
        res.status(500).send("ffmpeg failed");
    });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");

    ytdlp.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(res);
}
