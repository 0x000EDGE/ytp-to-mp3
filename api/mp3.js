import { ytdlp } from "yt-dlp-exec";
import { spawn } from "child_process";

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
    const url = req.query.url;
    if (!url) return res.status(400).send("Missing url");

    try {
        // yt-dlp stream → m4a
        const ytdlpProcess = ytdlp(url, {
            format: "bestaudio[ext=m4a]",
            output: "-",
            noPlaylist: true,
            quiet: true,
        });

        // ffmpeg → mp3
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

        ytdlpProcess.stdout.pipe(ffmpeg.stdin);

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");

        ffmpeg.stdout.pipe(res);
        ffmpeg.stderr.on("data", (d) => console.log("ffmpeg:", d.toString()));
        ytdlpProcess.stderr.on("data", (d) =>
            console.log("yt-dlp:", d.toString()),
        );
    } catch (e) {
        console.error(e);
        res.status(500).send("Download failed");
    }
}
