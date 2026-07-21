import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where, serverTimestamp, doc, getDoc } from "firebase/firestore";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
const appFirebase = initializeApp(firebaseConfig);
const db = "firestoreDatabaseId" in firebaseConfig
  ? getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId)
  : getFirestore(appFirebase);

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
      
      const getIsoDate = (timestamp: any): string => {
        if (!timestamp) return new Date().toISOString().split("T")[0];
        if (typeof timestamp.toDate === "function") {
          try {
            return timestamp.toDate().toISOString().split("T")[0];
          } catch (e) {
            // fallback
          }
        }
        if (timestamp instanceof Date) {
          return timestamp.toISOString().split("T")[0];
        }
        if (typeof timestamp === "string") {
          return timestamp.split("T")[0];
        }
        if (typeof timestamp === "number") {
          return new Date(timestamp).toISOString().split("T")[0];
        }
        return new Date().toISOString().split("T")[0];
      };

      const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [
        {
          loc: baseUrl,
          lastmod: new Date().toISOString().split("T")[0],
          changefreq: "daily",
          priority: "1.0",
        },
      ];

      // Fetch all AI tools dynamically
      try {
        const toolsSnap = await getDocs(collection(db, "ai_tools"));
        toolsSnap.forEach((doc) => {
          const data = doc.data();
          const lastmod = getIsoDate(data.updatedAt || data.createdAt);
          urls.push({
            loc: `https://www.agidappglobal.com/tool/${doc.id}`,
            lastmod,
            changefreq: "weekly",
            priority: "0.8",
          });
        });
      } catch (err) {
        console.error("Sitemap Tools Fetch Error:", err);
      }

      // Fetch all Blog articles dynamically
      try {
        const articlesSnap = await getDocs(collection(db, "articles"));
        articlesSnap.forEach((doc) => {
          const data = doc.data();
          const lastmod = getIsoDate(data.updatedAt || data.createdAt);
          urls.push({
            loc: `https://www.agidappglobal.com/blog/${doc.id}`,
            lastmod,
            changefreq: "weekly",
            priority: "0.8",
          });
        });
      } catch (err) {
        console.error("Sitemap Articles Fetch Error:", err);
      }

      // Build standard dynamic XML sitemap
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((item) => {
    return `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
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
    res.send("google.com, pub-7039003478830210, DIRECT, f08c47fec0942fa0");
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

  // New User Signup Notification & Welcome Email Dispatcher
  app.post("/api/notify-signup", async (req, res) => {
    try {
      const { uid, email, displayName } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: "Email is required" });
      }

      const adminEmail = "johnnyblueagency@gmail.com";
      const userName = displayName || "New User";

      // Configure transporter
      let transporter;
      let etherealInfo = "";
      
      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;

      if (gmailUser && gmailPass) {
        console.log("[SMTP] Using configured custom Gmail transport.");
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });
      } else {
        console.log("[SMTP] No custom Gmail credentials. Creating automatic sandbox/test account via Ethereal...");
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      // 1. Email to Admin (Notification)
      const adminMailOptions = {
        from: gmailUser ? `"AGIDAPP Notifications" <${gmailUser}>` : `"AGIDAPP Sandbox" <no-reply@agidappglobal.com>`,
        to: adminEmail,
        subject: `🚀 New User Signup: ${userName} on AGIDAPP Global!`,
        html: `
          <div style="font-family: 'Inter', sans-serif; background-color: #030712; color: #f3f4f6; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="font-size: 40px;">🚀</span>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; margin: 10px 0 0 0;">New User Signup Notification</h1>
              <p style="color: #9ca3af; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 5px;">Agidapp Global Platform Admin Alert</p>
            </div>
            
            <div style="background-color: #0b0f19; border: 1px solid #1f2937; padding: 24px; border-radius: 16px; margin-bottom: 30px;">
              <h2 style="color: #3b82f6; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 16px;">User Details</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="color: #9ca3af; padding: 8px 0; border-bottom: 1px solid #1f2937; font-weight: 500;">Display Name:</td>
                  <td style="color: #ffffff; padding: 8px 0; border-bottom: 1px solid #1f2937; font-weight: 700; text-align: right;">${userName}</td>
                </tr>
                <tr>
                  <td style="color: #9ca3af; padding: 8px 0; border-bottom: 1px solid #1f2937; font-weight: 500;">Email Address:</td>
                  <td style="color: #3b82f6; padding: 8px 0; border-bottom: 1px solid #1f2937; font-weight: 700; text-align: right;"><a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="color: #9ca3af; padding: 8px 0; border-bottom: 1px solid #1f2937; font-weight: 500;">User UID:</td>
                  <td style="color: #f3f4f6; padding: 8px 0; border-bottom: 1px solid #1f2937; font-family: monospace; font-size: 11px; text-align: right;">${uid}</td>
                </tr>
                <tr>
                  <td style="color: #9ca3af; padding: 8px 0; font-weight: 500;">Signup Time:</td>
                  <td style="color: #ffffff; padding: 8px 0; font-weight: 700; text-align: right;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #1f2937; padding-top: 20px;">
              This is an automated operational alert generated by agidappglobal.com.
            </div>
          </div>
        `
      };

      // 2. Email to User (Welcome Message)
      const userMailOptions = {
        from: gmailUser ? `"AGIDAPP Global" <${gmailUser}>` : `"AGIDAPP Global" <no-reply@agidappglobal.com>`,
        to: email,
        subject: `Welcome to AGIDAPP Global - The Best AI & AGI Tools Directory on the Globe! 🌍`,
        html: `
          <div style="font-family: 'Inter', sans-serif; background-color: #030712; color: #f3f4f6; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
            <div style="text-align: center; margin-bottom: 35px;">
              <div style="display: inline-block; background-color: #3b82f6; color: white; width: 60px; height: 60px; line-height: 60px; border-radius: 50%; font-size: 28px; margin-bottom: 15px;">🌍</div>
              <h1 style="color: #ffffff; font-size: 26px; font-weight: 900; tracking-tight: -0.03em; margin: 0;">Welcome to AGIDAPP Global!</h1>
              <p style="color: #3b82f6; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 6px; margin-bottom: 0;">The Premier AI & AGI Tools Directory</p>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin-bottom: 25px;">
              Hi <strong>${userName}</strong>,
            </p>

            <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin-bottom: 25px;">
              Thank you for signing up and joining our global community of digital innovators, developers, and AI builders.
            </p>

            <div style="background-color: #0b0f19; border: 1px solid #1f2937; padding: 24px; border-radius: 16px; margin-bottom: 30px;">
              <h2 style="color: #ffffff; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">Why agidappglobal.com is the best on the globe:</h2>
              
              <div style="margin-bottom: 18px;">
                <h3 style="color: #3b82f6; font-size: 13px; font-weight: 700; margin: 0 0 4px 0;">🚀 Comprehensive & Live Directory</h3>
                <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.5;">We index the most revolutionary AI and AGI platforms, web clients, native tools, and direct-to-download APK packages. Complete with Google-aligned dynamic SEO sitemaps for maximum search discoverability.</p>
              </div>

              <div style="margin-bottom: 18px;">
                <h3 style="color: #3b82f6; font-size: 13px; font-weight: 700; margin: 0 0 4px 0;">📊 Specifications & Deep Specs</h3>
                <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.5;">Every product lists detailed software licenses, api integrations, hosting environments, price modules, upvote rates, and official App Store and Google Play store user reviews.</p>
              </div>

              <div style="margin-bottom: 18px;">
                <h3 style="color: #3b82f6; font-size: 13px; font-weight: 700; margin: 0 0 4px 0;">🎬 Interactive Video Spotlights</h3>
                <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.5;">Watch and play high-definition YouTube promotional video clips directly within each software card for immediate proof of utility.</p>
              </div>

              <div>
                <h3 style="color: #3b82f6; font-size: 13px; font-weight: 700; margin: 0 0 4px 0;">🔔 Highly Social & Interactive</h3>
                <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.5;">Build curated public projects, create customized bookmark folders, write community comments, and listen to dynamic, custom click soundscapes in real-time.</p>
              </div>
            </div>

            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://www.agidappglobal.com" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 12px; transition: all 0.3s; box-shadow: 0 4px 15px rgba(59,130,246,0.3);">
                Explore AGIDAPP Global Now
              </a>
            </div>

            <p style="font-size: 12px; line-height: 1.6; color: #9ca3af; margin-bottom: 0; border-top: 1px solid #1f2937; padding-top: 20px; text-align: center;">
              See you on the platform,<br/>
              <strong>The AGIDAPP Global Team</strong><br/>
              <span style="color: #6b7280; font-size: 10px;">agidappglobal.com</span>
            </p>
          </div>
        `
      };

      // Send both
      const adminResult = await transporter.sendMail(adminMailOptions);
      const userResult = await transporter.sendMail(userMailOptions);

      console.log("[SMTP] Email to admin sent: ", adminResult.messageId);
      console.log("[SMTP] Email to user sent: ", userResult.messageId);

      if (!gmailUser || !gmailPass) {
        const testAdminUrl = nodemailer.getTestMessageUrl(adminResult);
        const testUserUrl = nodemailer.getTestMessageUrl(userResult);
        etherealInfo = `Admin Email Preview: ${testAdminUrl} | User Email Preview: ${testUserUrl}`;
        console.log(`[SMTP] ${etherealInfo}`);
      }

      res.json({ 
        success: true, 
        message: "Emails dispatched successfully", 
        etherealInfo 
      });
    } catch (error: any) {
      console.error("Failed to process signup notification / emails:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });


  // Direct Developer Contact Email Dispatcher
  app.post("/api/send-developer-email", async (req, res) => {
    try {
      const { toolName, developerEmail, senderName, senderEmail, subject, message } = req.body;
      if (!developerEmail || !senderEmail || !message) {
        return res.status(400).json({ success: false, error: "Developer email, sender email, and message are required" });
      }

      // Configure transporter
      let transporter;
      let etherealInfo = "";
      
      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;

      if (gmailUser && gmailPass) {
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });
      } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      const mailOptions = {
        from: gmailUser ? `"AGIDAPP Inquiries" <${gmailUser}>` : `"AGIDAPP Inquiries" <no-reply@agidappglobal.com>`,
        to: developerEmail,
        replyTo: senderEmail,
        subject: `[AGIDAPP Global] Direct Inquiry: ${subject || `Message about ${toolName}`}`,
        html: `
          <div style="font-family: 'Inter', sans-serif; background-color: #030712; color: #f3f4f6; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="font-size: 40px;">✉️</span>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; margin: 10px 0 0 0;">Direct Developer Inquiry</h1>
              <p style="color: #3b82f6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 5px; margin-bottom: 0;">Sent via agidappglobal.com for <strong>${toolName}</strong></p>
            </div>
            
            <div style="background-color: #0b0f19; border: 1px solid #1f2937; padding: 24px; border-radius: 16px; margin-bottom: 25px;">
              <h2 style="color: #3b82f6; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">Sender Information</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="color: #9ca3af; padding: 6px 0;">Name:</td>
                  <td style="color: #ffffff; padding: 6px 0; font-weight: 700; text-align: right;">${senderName || "Anonymous User"}</td>
                </tr>
                <tr>
                  <td style="color: #9ca3af; padding: 6px 0;">Email:</td>
                  <td style="color: #3b82f6; padding: 6px 0; font-weight: 700; text-align: right;"><a href="mailto:${senderEmail}" style="color: #3b82f6; text-decoration: none;">${senderEmail}</a></td>
                </tr>
              </table>
            </div>

            <div style="background-color: #0b0f19; border: 1px solid #1f2937; padding: 24px; border-radius: 16px; margin-bottom: 25px;">
              <h2 style="color: #3b82f6; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">Inquiry Details</h2>
              <p style="font-size: 13px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px;">Subject: ${subject || `Inquiry about ${toolName}`}</p>
              <div style="font-size: 13px; line-height: 1.6; color: #d1d5db; white-space: pre-wrap; background-color: #030712; padding: 16px; border-radius: 12px; border: 1px solid #111827;">${message}</div>
            </div>

            <div style="text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #1f2937; padding-top: 20px;">
              This inquiry was submitted by a logged-in user on <a href="https://www.agidappglobal.com" style="color: #3b82f6; text-decoration: none;">agidappglobal.com</a>.<br/>
              You can reply to this email directly to contact the sender.
            </div>
          </div>
        `
      };

      const result = await transporter.sendMail(mailOptions);
      console.log("[SMTP] Developer inquiry email sent: ", result.messageId);

      if (!gmailUser || !gmailPass) {
        const testUrl = nodemailer.getTestMessageUrl(result);
        etherealInfo = `Preview sent email at: ${testUrl}`;
        console.log(`[SMTP] ${etherealInfo}`);
      }

      res.json({ 
        success: true, 
        message: "Email sent to developer successfully", 
        etherealInfo 
      });
    } catch (error: any) {
      console.error("Failed to send email to developer:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });


  // Notify Subscribers of Tool Updates
  app.post("/api/notify-subscribers", async (req, res) => {
    try {
      const { toolId, name, category, type, url, desc, apk } = req.body;
      if (!toolId || !name) {
        return res.status(400).json({ success: false, error: "toolId and name are required" });
      }

      // Query subscribers for this tool
      const subsQuery = query(collection(db, "tool_subscriptions"), where("toolId", "==", toolId));
      const subsSnapshot = await getDocs(subsQuery);
      
      const subscribers: any[] = [];
      subsSnapshot.forEach((d) => {
        subscribers.push(d.data());
      });

      if (subscribers.length === 0) {
        return res.json({ success: true, message: "No subscribers found for this tool", count: 0 });
      }

      // Configure SMTP transporter
      let transporter;
      let etherealInfo = "";
      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;

      if (gmailUser && gmailPass) {
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });
      } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      const emailPromises = subscribers.map(async (sub) => {
        const mailOptions = {
          from: gmailUser ? `"AGIDAPP Updates" <${gmailUser}>` : `"AGIDAPP Updates" <updates@agidappglobal.com>`,
          to: sub.userEmail,
          subject: `✨ Update Alert: ${name} has been updated on AGIDAPP Global!`,
          html: `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f3f4f6; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; width: 64px; height: 64px; line-radius: 16px; font-size: 32px; margin-bottom: 16px; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);">✨</div>
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; margin: 0 0 4px 0;">Tool Update Alert</h1>
                <p style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">An item in your subscribed tools has changed</p>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin-bottom: 24px;">
                Hello,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin-bottom: 24px;">
                You are receiving this email because you subscribed to updates for <strong>${name}</strong> on AGIDAPP Global. An administrator has recently updated its details:
              </p>

              <div style="background-color: #0b0f19; border: 1px solid #1f2937; padding: 24px; border-radius: 16px; margin-bottom: 24px;">
                <h2 style="color: #3b82f6; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">Updated Details for ${name}</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="color: #9ca3af; padding: 8px 0; border-bottom: 1px solid #111827; font-weight: 500;">Category:</td>
                    <td style="color: #ffffff; padding: 8px 0; border-bottom: 1px solid #111827; font-weight: 700; text-align: right;">${category || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="color: #9ca3af; padding: 8px 0; border-bottom: 1px solid #111827; font-weight: 500;">Access Type:</td>
                    <td style="color: #ffffff; padding: 8px 0; border-bottom: 1px solid #111827; font-weight: 700; text-align: right;">${type || "N/A"}</td>
                  </tr>
                  ${apk ? `
                  <tr>
                    <td style="color: #9ca3af; padding: 8px 0; border-bottom: 1px solid #111827; font-weight: 500;">APK Package:</td>
                    <td style="color: #3b82f6; padding: 8px 0; border-bottom: 1px solid #111827; font-weight: 700; text-align: right;"><a href="${apk}" style="color: #3b82f6; text-decoration: none;">Download APK</a></td>
                  </tr>` : ""}
                </table>

                <div style="margin-top: 16px;">
                  <h3 style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0;">Description</h3>
                  <div style="font-size: 13px; line-height: 1.6; color: #d1d5db; background-color: #030712; padding: 12px; border-radius: 8px; border: 1px solid #111827;">
                    ${desc || "No description provided."}
                  </div>
                </div>
              </div>

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${url || `https://www.agidappglobal.com/share/${toolId}`}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); transition: background-color 0.2s;">
                  Launch / View Tool
                </a>
              </div>

              <div style="text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #1f2937; padding-top: 20px;">
                You are subscribed to updates for ${name}. To unsubscribe, visit AGIDAPP Global and toggle the subscription button on this tool.
              </div>
            </div>
          `
        };

        const result = await transporter.sendMail(mailOptions);
        
        // Log to existing notifications system
        await addDoc(collection(db, "notifications"), {
          type: "tool_update_alert",
          message: `Notified ${sub.userEmail} about updates to ${name}`,
          userId: sub.userId,
          userEmail: sub.userEmail,
          timestamp: serverTimestamp(),
          read: false
        });

        return result;
      });

      const results = await Promise.all(emailPromises);
      console.log(`[SMTP] Dispatched ${results.length} subscription update notifications.`);

      if (!gmailUser || !gmailPass) {
        const testUrl = nodemailer.getTestMessageUrl(results[0]);
        etherealInfo = `Preview first notification at: ${testUrl}`;
        console.log(`[SMTP] ${etherealInfo}`);
      }

      res.json({
        success: true,
        message: `Notifications sent to ${subscribers.length} subscribers`,
        count: subscribers.length,
        etherealInfo
      });
    } catch (error: any) {
      console.error("Failed to notify subscribers:", error);
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
