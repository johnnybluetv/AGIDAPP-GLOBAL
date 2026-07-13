import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where, serverTimestamp, doc, getDoc } from "firebase/firestore";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Resilient text content generation with automatic model fallback & retry
async function generateContentResilient(params: {
  contents: any;
  config?: any;
  defaultModel?: string;
  maxRetries?: number;
}) {
  const modelsToTry = [
    params.defaultModel || "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];
  let lastError;
  const maxRetries = params.maxRetries || 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const model = modelsToTry[attempt % modelsToTry.length];
    try {
      console.log(`[Gemini SDK] Generating content using model: ${model} (Attempt ${attempt + 1}/${maxRetries})`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const isRetryable = error?.message?.includes("503") || error?.status === 503 || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE");
      
      if (isRetryable && attempt < maxRetries - 1) {
        const backoffDelay = 1000 * Math.pow(1.5, attempt);
        console.warn(`[Gemini SDK] Model ${model} returned unavailable or rate limit. Retrying in ${backoffDelay}ms... error: ${error.message || error}`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Permanent 301 Redirect non-www to www for consolidated SEO indexing and Google Search Console alignment
  app.use((req, res, next) => {
    const host = req.headers.host;
    if (host === "agidappglobal.com") {
      return res.redirect(301, `https://www.agidappglobal.com${req.originalUrl}`);
    }
    next();
  });

  // Dynamic Sitemap Generator for Google Search indexing
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = "https://www.agidappglobal.com/";
      const urls: string[] = [
        baseUrl, // Homepage with trailing slash explicitly
      ];

      // Fetch all AI tools dynamically
      try {
        const toolsSnap = await getDocs(collection(db, "ai_tools"));
        toolsSnap.forEach((doc) => {
          urls.push(`https://www.agidappglobal.com/tool/${doc.id}`);
        });
      } catch (err) {
        console.error("Sitemap Tools Fetch Error:", err);
      }

      // Fetch all Blog articles dynamically
      try {
        const articlesSnap = await getDocs(collection(db, "articles"));
        articlesSnap.forEach((doc) => {
          urls.push(`https://www.agidappglobal.com/blog/${doc.id}`);
        });
      } catch (err) {
        console.error("Sitemap Articles Fetch Error:", err);
      }

      // Build standard dynamic XML sitemap
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((url) => {
    return `  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>${url === baseUrl ? "1.0" : "0.8"}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.send(sitemapXml);
    } catch (error) {
      console.error("Sitemap generation error:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Google AdSense Authorization Route
  app.get("/ads.txt", (req, res) => {
    res.set("Content-Type", "text/plain");
    res.send("google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0");
  });

  // Dynamic SEO Search Engine Sitemap Ping Endpoint
  app.post("/api/seo/ping", async (req, res) => {
    try {
      const sitemapUrl = "https://www.agidappglobal.com/sitemap.xml";
      const responses: any = {};

      try {
        const googlePing = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
        responses.google = { status: googlePing.status, ok: googlePing.ok };
      } catch (err: any) {
        responses.google = { error: err.message };
      }

      try {
        const bingPing = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
        responses.bing = { status: bingPing.status, ok: bingPing.ok };
      } catch (err: any) {
        responses.bing = { error: err.message };
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        sitemapUrl,
        results: responses
      });
    } catch (error: any) {
      console.error("SEO ping error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Share Route for Rich Previews
  app.get("/share/:toolId", async (req, res) => {
    try {
      const { toolId } = req.params;
      const toolRef = doc(db, "ai_tools", toolId);
      const toolSnap = await getDoc(toolRef);

      if (!toolSnap.exists()) {
        return res.status(404).send("Tool not found");
      }

      const tool = toolSnap.data();
      const baseUrl = "https://www.agidappglobal.com";
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(tool.url).hostname}&sz=128`;

      // Serve a simple HTML page with OG tags for social preview
      // and then redirect/provide a link to the main app
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${tool.name} | Agidapp Global</title>
  <meta name="title" content="${tool.name} | Agidapp Global">
  <meta name="description" content="${tool.desc}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Agidapp Global">
  <meta property="og:url" content="${baseUrl}/share/${toolId}">
  <meta property="og:title" content="${tool.name} - Discover on Agidapp Global">
  <meta property="og:description" content="${tool.desc}">
  <meta property="og:image" content="${baseUrl}/logo.png">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${baseUrl}/share/${toolId}">
  <meta property="twitter:title" content="${tool.name} - Discover on Agidapp Global">
  <meta property="twitter:description" content="${tool.desc}">
  <meta property="twitter:image" content="${baseUrl}/logo.png">

  <style>
    body { 
      background: #020617; 
      color: white; 
      font-family: system-ui, -apple-system, sans-serif; 
      display: flex; 
      flex-direction: column;
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      margin: 0; 
      text-align: center;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      padding: 2rem;
      border-radius: 1.5rem;
      max-width: 400px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    img { width: 64px; height: 64px; margin-bottom: 1rem; border-radius: 1rem; }
    h1 { margin: 0; font-size: 1.5rem; }
    p { color: #94a3b8; font-size: 0.875rem; margin: 1rem 0 2rem; }
    a { 
      display: inline-block; 
      background: #2563eb; 
      color: white; 
      text-decoration: none; 
      padding: 0.75rem 1.5rem; 
      border-radius: 0.75rem; 
      font-weight: bold;
      transition: background 0.2s;
    }
    a:hover { background: #1d4ed8; }
  </style>
  <script>
    // Redirect to the main app with the tool highlighted after a short delay
    setTimeout(() => {
      window.location.href = "/?toolId=${toolId}";
    }, 1500);
  </script>
</head>
<body>
  <div class="card">
    <img src="${faviconUrl}" alt="">
    <h1>${tool.name}</h1>
    <p>${tool.desc}</p>
    <a href="/?toolId=${toolId}">Opening in Agidapp Global...</a>
  </div>
</body>
</html>`;
      res.send(html);
    } catch (error) {
      console.error("Share Error:", error);
      res.status(500).send("An error occurred");
    }
  });

  // Tool Route for Search Engine Indexing and Rich Previews
  app.get("/tool/:toolId", async (req, res) => {
    try {
      const { toolId } = req.params;
      const toolRef = doc(db, "ai_tools", toolId);
      const toolSnap = await getDoc(toolRef);

      if (!toolSnap.exists()) {
        return res.status(404).send("Tool not found");
      }

      const tool = toolSnap.data();
      const baseUrl = "https://www.agidappglobal.com";
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(tool.url).hostname}&sz=128`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tool.name} | Agidapp Global</title>
  <meta name="title" content="${tool.name} | Agidapp Global">
  <meta name="description" content="${tool.desc}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Agidapp Global">
  <meta property="og:url" content="${baseUrl}/tool/${toolId}">
  <meta property="og:title" content="${tool.name} - Discover on Agidapp Global">
  <meta property="og:description" content="${tool.desc}">
  <meta property="og:image" content="${baseUrl}/logo.png">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${baseUrl}/tool/${toolId}">
  <meta property="twitter:title" content="${tool.name} - Discover on Agidapp Global">
  <meta property="twitter:description" content="${tool.desc}">
  <meta property="twitter:image" content="${baseUrl}/logo.png">

  <style>
    body { background: #020617; color: white; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .card { background: #0f172a; border: 1px solid #1e293b; padding: 2rem; border-radius: 1.5rem; max-width: 400px; }
    img { width: 64px; height: 64px; margin-bottom: 1rem; border-radius: 1rem; }
    a { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: bold; margin-top: 1rem; }
  </style>
  <script>
    setTimeout(() => {
      window.location.href = "/?toolId=${toolId}";
    }, 1000);
  </script>
</head>
<body>
  <div class="card">
    <img src="${faviconUrl}" alt="">
    <h1>${tool.name}</h1>
    <p>${tool.desc}</p>
    <a href="/?toolId=${toolId}">Explore on Agidapp Global</a>
  </div>
</body>
</html>`;
      res.send(html);
    } catch (error) {
      console.error("Tool SEO Error:", error);
      res.status(500).send("An error occurred");
    }
  });

  // Blog Route for Search Engine Indexing and Rich Previews
  app.get("/blog/:articleId", async (req, res) => {
    try {
      const { articleId } = req.params;
      const artRef = doc(db, "articles", articleId);
      const artSnap = await getDoc(artRef);

      if (!artSnap.exists()) {
        return res.status(404).send("Article not found");
      }

      const art = artSnap.data();
      const baseUrl = "https://www.agidappglobal.com";
      const snippet = art.content.substring(0, 160).replace(/[#*`]/g, '');

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${art.title} | Agidapp Global Knowledge</title>
  <meta name="title" content="${art.title} | Agidapp Global Knowledge">
  <meta name="description" content="${snippet}">
  <meta name="author" content="${art.authorName}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Agidapp Global">
  <meta property="og:url" content="${baseUrl}/blog/${articleId}">
  <meta property="og:title" content="${art.title} - Agidapp Global">
  <meta property="og:description" content="${snippet}">
  <meta property="og:image" content="${art.mediaUrl || (baseUrl + '/logo.png')}">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${baseUrl}/blog/${articleId}">
  <meta property="twitter:title" content="${art.title} - Agidapp Global">
  <meta property="twitter:description" content="${snippet}">
  <meta property="twitter:image" content="${art.mediaUrl || (baseUrl + '/logo.png')}">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "${art.title}",
      "description": "${snippet}",
      "author": { "@type": "Person", "name": "${art.authorName}" },
      "datePublished": "${art.createdAt?.toDate ? art.createdAt.toDate().toISOString() : new Date().toISOString()}"
    }
  </script>

  <style>
    body { background: #020617; color: white; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .card { background: #0f172a; border: 1px solid #1e293b; padding: 2.5rem; border-radius: 2rem; max-width: 500px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    h1 { margin: 0 0 1rem; font-size: 1.75rem; color: #f8fafc; }
    p { color: #94a3b8; font-size: 1rem; margin: 0 0 2rem; line-height: 1.6; }
    a { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 1rem 2rem; border-radius: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.2s; }
    a:hover { background: #1d4ed8; transform: scale(1.05); }
  </style>
  <script>
    setTimeout(() => {
      window.location.href = "/?articleId=${articleId}";
    }, 1200);
  </script>
</head>
<body>
  <div class="card">
    <div style="color: #3b82f6; font-weight: 900; margin-bottom: 1.5rem; font-size: 0.75rem; letter-spacing: 0.4em;">AGIDAPP GLOBAL KNOWLEDGE BASE</div>
    <h1>${art.title}</h1>
    <p>${snippet}...</p>
    <a href="/?articleId=${articleId}">Read Full Article</a>
  </div>
</body>
</html>`;
      res.send(html);
    } catch (error) {
      console.error("Blog SEO Error:", error);
      res.status(500).send("An error occurred");
    }
  });

  // API Route: Scraper / Expansion Utility
  app.post("/api/expand", async (req, res) => {
    try {
      const { userId, userEmail } = req.body;

      if (!userId || !userEmail) {
        return res.status(401).json({ success: false, error: "Authentication required" });
      }

      // RBAC Check
      let isAuthorized = userEmail === "johnnyblueagency@gmail.com";
      
      if (!isAuthorized) {
        const adminSnap = await getDoc(doc(db, "admins", userId));
        if (adminSnap.exists()) {
          const role = adminSnap.data().role;
          if (["Admin", "Manager", "Editor"].includes(role)) {
            isAuthorized = true;
          }
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ success: false, error: "Access denied: Privileged users only" });
      }

      console.log(`Expansion triggered by ${userEmail} (${userId})`);
      
      const response = await generateContentResilient({
        contents: "Generate a list of 75 unique, high-quality, and highly diverse AI tools, platforms, or mobile applications to scale our directory toward a goal of 1,000,000+ indexed items. Prioritize extreme variety: include enterprise LLM infrastructure, niche creative AI (molecular biology, urban planning, generative music, 3D rigging), developer SDKs for computer vision, edge AI APKs for specific industries, and obscure but functional open-source utilities. Each tool must have a valid URL. For each tool, provide name, URL, a unique 1-sentence description, category ('LLM & Chat', 'Image & Art', 'Developer Tools', 'Productivity', 'Audio & Video', 'Other'), and type. Do NOT include common tools like ChatGPT or Midjourney. Focus on the 'long tail' of the AI ecosystem.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                url: { type: Type.STRING },
                desc: { type: Type.STRING },
                category: { 
                  type: Type.STRING, 
                  description: "Must be: LLM & Chat, Image & Art, Developer Tools, Productivity, Audio & Video, or Other" 
                },
                type: { 
                  type: Type.STRING, 
                  description: "Must be: Web App, Software (Desktop), Mobile / APK, or API / Platform" 
                }
              },
              required: ["name", "url", "desc", "category", "type"]
            }
          }
        },
        maxRetries: 4
      });

      if (!response.text) throw new Error("No response text from AI");

      const aiGeneratedTools = JSON.parse(response.text);
      const results = [];
      const colRef = collection(db, "ai_tools");

      for (const tool of aiGeneratedTools) {
        // Check for duplicates by URL or Name
        const q = query(colRef, where("url", "==", tool.url));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          const newDoc = {
            ...tool,
            apk: "", // Default empty
            upvotes: Math.floor(Math.random() * 100), // Random starting upvotes for indexed tools
            createdAt: serverTimestamp()
          };
          const docRef = await addDoc(colRef, newDoc);
          results.push({ name: tool.name, id: docRef.id, status: "indexed" });
        } else {
          results.push({ name: tool.name, status: "skipped (already indexed)" });
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Expansion Error:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // AI Suggest Title
  app.post("/api/ai/suggest-titles", async (req, res) => {
    try {
      const { topic } = req.body;
      const response = await generateContentResilient({
        contents: `Suggest 5 catchy, professional, and SEO-friendly article titles for the topic: "${topic}". Return as a JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      res.json({ titles: JSON.parse(response.text) });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // AI Write Content
  app.post("/api/ai/write", async (req, res) => {
    try {
      const { prompt, currentContent, title } = req.body;
      const response = await generateContentResilient({
        contents: `You are a professional AI technology writer. 
        Title: ${title}
        Current Content: ${currentContent}
        User Intent: ${prompt}
        
        Continue writing the article or improve the content based on the intent. Return the updated content only. Use Markdown.`,
      });
      res.json({ content: response.text });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // AI Generate Image
  app.post("/api/ai/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      let response;
      const maxRetries = 3;
      let lastError;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`[Gemini SDK] Generating image (Attempt ${attempt + 1}/${maxRetries})`);
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: { parts: [{ text: prompt }] },
            config: {
              imageConfig: {
                aspectRatio: "16:9"
              }
            }
          });
          break; // success
        } catch (error: any) {
          lastError = error;
          const isRetryable = error?.message?.includes("503") || error?.status === 503 || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE");

          if (isRetryable && attempt < maxRetries - 1) {
            const backoffDelay = 1500 * Math.pow(1.5, attempt);
            console.warn(`[Gemini SDK] Image generation returned unavailable. Retrying in ${backoffDelay}ms... error: ${error.message || error}`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
          throw error;
        }
      }

      if (!response) {
        throw lastError || new Error("Failed to get image generation response");
      }

      let base64 = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64 = part.inlineData.data;
          break;
        }
      }

      if (!base64) throw new Error("Failed to generate image");
      res.json({ image: `data:image/png;base64,${base64}` });
    } catch (error: any) {
      console.error("Image Gen Error:", error);
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // AI Generate Video (Step 1: Start)
  app.post("/api/ai/generate-video", async (req, res) => {
    try {
      const { prompt } = req.body;
      let operation;
      const maxRetries = 3;
      let lastError;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`[Gemini SDK] Generating video (Attempt ${attempt + 1}/${maxRetries})`);
          operation = await ai.models.generateVideos({
            model: "veo-3.1-lite-generate-preview",
            prompt: prompt,
            config: {
              numberOfVideos: 1,
              resolution: "720p",
              aspectRatio: "16:9"
            }
          });
          break; // success
        } catch (error: any) {
          lastError = error;
          const isRetryable = error?.message?.includes("503") || error?.status === 503 || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE");

          if (isRetryable && attempt < maxRetries - 1) {
            const backoffDelay = 1500 * Math.pow(1.5, attempt);
            console.warn(`[Gemini SDK] Video generation returned unavailable. Retrying in ${backoffDelay}ms... error: ${error.message || error}`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
          throw error;
        }
      }

      if (!operation) {
        throw lastError || new Error("Failed to start video generation");
      }

      res.json({ operationName: operation.name });
    } catch (error: any) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // AI Video Status (Step 2: Poll)
  app.post("/api/ai/video-status", async (req, res) => {
    try {
      const { operationName } = req.body;
      const { GenerateVideosOperation } = await import("@google/genai");
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ done: updated.done });
    } catch (error: any) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // AI Video Download (Step 3: Stream)
  app.post("/api/ai/video-download", async (req, res) => {
    try {
      const { operationName } = req.body;
      const { GenerateVideosOperation } = await import("@google/genai");
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!uri) return res.status(404).json({ error: "Video not ready" });

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      });

      res.setHeader('Content-Type', 'video/mp4');
      if (videoRes.body) {
        // @ts-ignore
        const reader = videoRes.body.getReader();
        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            return;
          }
          res.write(value);
          await pump();
        };
        await pump();
      } else {
        res.status(500).send("No video body");
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
