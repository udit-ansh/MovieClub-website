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

  // API Endpoint to fetch movie details utilizing Gemini Content Generation and live scrapers
  app.post("/api/movie-details", async (req, res) => {
    const { movieQuery } = req.body;
    if (!movieQuery) {
      return res.status(400).json({ error: "movieQuery is required" });
    }

    console.log(`[Server] Resolving movie details for query/link: "${movieQuery}"`);

    try {
      // Fetch rich metadata using Structured JSON Schema and Google Search Grounding to find actual references
      const gResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Search Google for the movie details: "${movieQuery}". If this is a URL (such as an IMDb link like imdb.com/title/... or a Letterboxd link like letterboxd.com/film/...), resolve the exact movie from that link. Find the official release year, director, runtime (e.g. '130 min'), genres, a synopsis, its exact Letterboxd slug (e.g., 'tumbbad', 'perfect-days'), and its exact Wikipedia page title (e.g., 'Tumbbad (film)'). Also find a widescreen photographic snapshot backdrop URL and a high-quality poster (ideally from TMDB/Wikipedia).`,
        config: {
          systemInstruction: "You are a professional cinema curator for the IISER Kolkata Movie Club. Search movie archives and retrieve precise metadata. Return the synopsis/description concisely (approx 100-150 words). Format the genre as a comma-separated list.",
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
              letterboxdSlug: { type: Type.STRING, description: "The lowercase official Letterboxd URL slug, e.g. 'tumbbad', 'perfect-days'." },
              wikipediaTitle: { type: Type.STRING, description: "The exact Wikipedia title suitable for URL encoding, e.g. 'Tumbbad (film)'." },
              posterUrl: { type: Type.STRING, description: "A high-quality movie poster URL. Prefer TMDB poster URL if found." },
              backdropUrl: { type: Type.STRING, description: "Widescreen background image/snapshot of the movie." }
            },
            required: ["title", "year", "description", "director", "duration", "genre", "letterboxdSlug", "wikipediaTitle", "posterUrl", "backdropUrl"]
          }
        }
      });

      const textOutput = gResponse.text;
      if (!textOutput) {
        throw new Error("No data returned from Gemini content generator.");
      }

      const movieData = JSON.parse(textOutput.trim());
      
      // Multi-layer actual movie poster retriever compiled server-side
      let realPosterUrl: string | null = null;

      // 1. Scraping official Letterboxd Open Graph tags if possible
      if (movieData.letterboxdSlug) {
        try {
          const cleanSlug = movieData.letterboxdSlug.toLowerCase().trim().replace(/[^a-z0-9\-]/g, '');
          const lbUrl = `https://letterboxd.com/film/${cleanSlug}/`;
          console.log(`[Server Scraper] Fetching Letterboxd metadata for: ${lbUrl}`);
          
          const lbRes = await fetch(lbUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
          });

          if (lbRes.ok) {
            const html = await lbRes.text();
            const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) 
                       || html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
            if (match && match[1] && !match[1].includes("letterboxd-share-logo")) {
              realPosterUrl = match[1];
              console.log(`[Server Scraper] Successfully retrieved Letterboxd poster: ${realPosterUrl}`);
            }
          }
        } catch (err) {
          console.warn("[Server Scraper] Letterboxd scraping failed:", err);
        }
      }

      // 2. Fetching Wikipedia Page Summary REST API as a premium fallback
      if (!realPosterUrl && (movieData.wikipediaTitle || movieData.title)) {
        try {
          const searchTitle = (movieData.wikipediaTitle || movieData.title).trim().replace(/ /g, '_');
          const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTitle)}`;
          console.log(`[Server Scraper] Requesting Wikipedia original image for: ${wikiUrl}`);
          
          const wikiRes = await fetch(wikiUrl, {
            headers: {
              'User-Agent': 'IISERKolkataMovieClub/1.0 (uditansh2007@gmail.com) Node-Fetch'
            }
          });

          if (wikiRes.ok) {
            const wikiData = await wikiRes.json() as any;
            if (wikiData.originalimage && wikiData.originalimage.source) {
              realPosterUrl = wikiData.originalimage.source;
              console.log(`[Server Scraper] Successfully retrieved Wikipedia original image: ${realPosterUrl}`);
            }
          }
        } catch (err) {
          console.warn("[Server Scraper] Wikipedia fetch failed:", err);
        }
      }

      // Populate scraped actual poster or keep the AI search fallback
      if (realPosterUrl) {
        movieData.posterUrl = realPosterUrl;
      }

      res.json(movieData);
    } catch (e: any) {
      console.error("Gemini Movie Details Fetch Failure:", e);
      res.status(500).json({ error: e.message || "Failed to retrieve cinema metadata." });
    }
  });

  // API Endpoint to search movies and provide real-time suggestions using Gemini or Web Search Grounding
  app.post("/api/search-movies", async (req, res) => {
    const { query } = req.body;
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    console.log(`[Server Autocomplete] Searching for partial query: "${query}"`);

    try {
      const isUrl = query.toLowerCase().includes("imdb.com/") || query.toLowerCase().includes("letterboxd.com/");
      
      const gResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Search Google for movies matching: "${query}". Return a structured list of up to 4 most matching movies. If the query is an IMDb link or Letterboxd film link, resolve details for that single exact movie. For each movie, find its title, year, director, runtime (e.g. '120 min'), genre(s) comma-separated, a short 1-sentence description, a Letterboxd slug (e.g. 'inception'), a Wikipedia title, and a high-quality poster (prefer TMDB URLs or high-quality posters from search).`,
        config: {
          systemInstruction: "You are a professional cinema curator. Provide search suggestions for matches with precise title, year, director, runtime duration, comma-separated genres, and standard web poster artwork URLs.",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                year: { type: Type.INTEGER },
                description: { type: Type.STRING, description: "Concise 1-sentence synopsis." },
                director: { type: Type.STRING },
                duration: { type: Type.STRING, description: "e.g. '120 min'" },
                genre: { type: Type.STRING, description: "e.g. 'Drama, Thriller'" },
                letterboxdSlug: { type: Type.STRING },
                wikipediaTitle: { type: Type.STRING },
                posterUrl: { type: Type.STRING },
                backdropUrl: { type: Type.STRING }
              },
              required: ["title", "year", "description", "director", "duration", "genre", "letterboxdSlug", "wikipediaTitle", "posterUrl", "backdropUrl"]
            }
          }
        }
      });

      const textOutput = gResponse.text;
      if (!textOutput) {
        return res.json([]);
      }

      const moviesList = JSON.parse(textOutput.trim());
      res.json(moviesList);
    } catch (e: any) {
      console.error("Gemini Movie Suggestion Failure:", e);
      res.status(500).json({ error: e.message || "Failed to retrieve suggestion results." });
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
