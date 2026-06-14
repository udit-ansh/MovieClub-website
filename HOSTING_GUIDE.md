# IISER Kolkata Movie Club — Deployment & Firebase Authorization Guide

This guide is a complete, step-by-step checklist to help you migrate, host, and configure this website under your own GitHub profile and Firebase project in the future.

---

## 1. Authorizing Your Production Domain in Firebase

When you host your application on a custom domain (such as GitHub Pages or Vercel), Firebase Authentication will block Google Sign-In with a domain-not-authorized security error until you register the destination URL.

### 📋 Steps to Authorize a Domain:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your Firebase Project from the dashboard.
3. In the left navigation sidebar, click on **Authentication** under the *Build* tab.
4. Click on the **Settings** tab at the top-right of the Authentication panel.
5. In the left submenu under Settings, select **Authorized domains**.
6. Click the **Add domain** button.
7. Enter your domain name:
   - **For GitHub Pages:** `your-username.github.io`
   - **For Vercel:** `your-app-slug.vercel.app`
   - **For Custom Domain:** `yourdomain.com`
8. Click **Add** (or **Save**).

---

## 2. Choosing Where to Host Your Full-Stack Application

Because this application utilizes a server (`server.ts`) for real-time Letterboxd scraping and Gemini AI content proxying, it is structured as a **Full-Stack Node.js app (Express + Vite)** rather than a simple static frontend SPA.

Here are the recommended free/hobby tier cloud hosting services that natively support full-stack Node.js servers:

### Option A: Render (Easiest Free Tier Node Hosting)
1. Push your code repository to your GitHub profile.
2. Sign in to [Render](https://render.com/) using your GitHub account.
3. Click **New** -> **Web Service**.
4. Connect your movie club repository.
5. Configure the build parameters:
   - **Runtime:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
6. Add your environment variables in Render's dashboard under **Environment**:
   - `GEMINI_API_KEY`: *(Get your key from Google AI Studio)*
   - `NODE_ENV`: `production`

### Option B: Railway or Koyeb
Both provide high-performance containers for full-stack applications with near-instant deployment via a simple GitHub import. Ensure you configure **Port 3000** on your hosting panel!

---

## 3. Local Environment Variables Setup (`.env`)

When running on your own system, create a file named `.env` in your project root with the following keys:

```env
# Gemini AI Secret Key (Get yours free at https://aistudio.google.com)
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Firebase Configuration (Replace with keys from your Firebase Console under Project Settings)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 4. Re-authorizing Google OAuth Client (If needed)

If Google Sign-In popups fail to authorize on your custom domain, make sure you have added your custom callback URL to your GCP Console:
1. Go to the [Google Cloud Console Auth Credentials](https://console.cloud.google.com/apis/credentials).
2. Find the **OAuth 2.0 Client ID** that was generated for your Firebase Auth integration.
3. Under **Authorized redirect URIs**, verify that both:
   - `https://your-project-id.firebaseapp.com/__/auth/handler`
   - `https://your-project-id.web.app/__/auth/handler`
   are present. 

Enjoy your custom movie activity tracking portal ! 🎬🍿
