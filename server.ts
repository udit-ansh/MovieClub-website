import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini client using official @google/genai SDK guidelines
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Endpoint to fetch movie details utilizing Gemini Content Generation
  app.post("/api/movie-details", async (req, res) => {
    const { movieQuery } = req.body;
    if (!movieQuery) {
      return res.status(400).json({ error: "movieQuery is required" });
    }

    try {
      // Fetch rich metadata using Structured JSON Schema and Google Search Grounding to find actual live image URLs
      const gResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Search Google for the movie: "${movieQuery}" on TMDB, Letterboxd, IMDb, Wikipedia, or TMDB image CDN. Find the correct release year, director, runtime, genres, a synopsis, and retrieve the EXACT live, high-resolution official poster image URL (usually hosted on image.tmdb.org, tmdb.org, media-amazon.com, or wikimedia.org) and a widescreen backdrop URL. Do not guess filenames; use the googleSearch tool to confirm the image coordinates are actual live public links.`,
        config: {
          systemInstruction: "You are a professional cinema curator for the IISER Kolkata Movie Club. Search movie archives and retrieve precise metadata. Return the synopsis/description concisely (approx 100-150 words). Format the genre as a comma-separated list. Ensure posterUrl is a high-resolution, public image URL. Ensure backdropUrl is a widescreen landscape poster/snapshot of the movie.",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Standard official title of the movie." },
              year: { type: Type.INTEGER, description: "Correct release calendar year." },
              description: { type: Type.STRING, description: "Compelling cinematic synopsis of the movie (under 150 words)." },
              director: { type: Type.STRING, description: "Director of the film." },
              duration: { type: Type.STRING, description: "Runtime format, e.g. '130 min' or '1h 55m'." },
              genre: { type: Type.STRING, description: "Primary genre(s) formatted as a comma-separated list, e.g. 'Drama, Thriller, Sci-Fi'." },
              posterUrl: { type: Type.STRING, description: "A live high-quality movie poster URL found via Google Search (e.g. from image.tmdb.org, media-amazon.com, wikimedia.org). Best quality available." },
              backdropUrl: { type: Type.STRING, description: "Widescreen background image/snapshot of the movie found via Google Search." }
            },
            required: ["title", "year", "description", "director", "duration", "genre", "posterUrl", "backdropUrl"]
          }
        }
      });

      const textOutput = gResponse.text;
      if (!textOutput) {
        throw new Error("No data returned from Gemini content generator.");
      }

      const movieData = JSON.parse(textOutput.trim());
      res.json(movieData);
    } catch (e: any) {
      console.error("Gemini Movie Details Fetch Failure:", e);
      res.status(500).json({ error: e.message || "Failed to retrieve cinema metadata." });
    }
  });

  // Serve static assets and bind Vite's development middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Support both root paths and the predefined '/MovieClub-website/' asset base paths
    app.use("/MovieClub-website", express.static(distPath));
    app.use(express.static(distPath));

    app.all("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IISER Kolkata Movie Club full-stack server running on standard port:${PORT}`);
  });
}

startServer();
