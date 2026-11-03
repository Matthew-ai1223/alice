# Vercel Deployment Guide

This guide walks you through deploying the **Digital Dictionary of Yorùbá Traditional Medicinal Vocabulary** to [Vercel](https://vercel.com).

---

## 1. Project Deployment Architecture

The project is structured for a zero-config, high-performance Vercel fullstack deployment:

```
c:\Users\USER\Desktop\alice\
├── vercel.json           # Vercel routing & serverless configuration
├── package.json          # Root orchestration & dependencies
├── api/
│   └── index.js          # Vercel Serverless Function entrypoint
├── server/               # Express & TypeScript backend
│   └── dist/             # Compiled backend code (built during deployment)
├── index.html            # Client web application (PWA enabled)
├── admin.html            # Admin data upload & category manager
├── about.html            # Research & author bio
├── app.js                # Frontend controller
├── styles.css            # Responsive navy & gold stylesheet
└── images/               # High-resolution medicinal photos (served by CDN)
```

- **Static Frontend**: `index.html`, `admin.html`, `styles.css`, and `app.js` are served directly via Vercel's global Edge CDN with sub-50ms latency.
- **Serverless API**: All calls to `/api/*` (`/api/medicinals`, `/api/categories`, `/api/health`) are routed automatically to the Express serverless function in `api/index.js`.
- **Clean URLs**: Access pages directly as `/admin`, `/about`, or with `.html`.

---

## 2. Option A: Deploy with GitHub & Vercel Dashboard (Recommended)

This is the standard approach. Any time you push changes to GitHub, Vercel automatically rebuilds and updates your live site.

### Step 1: Push Project to GitHub
1. Open PowerShell or Command Prompt in `c:\Users\USER\Desktop\alice`:
   ```bash
   git add .
   git commit -m "Configure fullstack deployment for Vercel"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New…** → **Project**.
3. Choose your GitHub repository and click **Import**.
4. In the Project Configuration:
   - **Framework Preset**: Leave as `Other`.
   - **Root Directory**: Leave as `./` (default).
   - **Build Command**: `npm run build` (detected automatically).
   - **Output Directory**: Leave empty (default).

### Step 3: Add MongoDB Cloud Database (MongoDB Atlas)
1. Expand the **Environment Variables** section on Vercel.
2. Add the following variable:
   - **Key**: `MONGODB_URI`
   - **Value**: Your MongoDB Atlas connection string:
     ```
     mongodb+srv://<username>:<password>@cluster0.mongodb.net/yoruba_medicinal?retryWrites=true&w=majority
     ```
   *(Note: If you do not provide `MONGODB_URI` immediately, the system will seamlessly run using built-in fallback seed data!)*

3. Click **Deploy**.

---

## 3. Option B: Deploy via Vercel CLI

If you prefer deploying directly from your computer terminal without connecting GitHub:

1. Install the Vercel CLI globally (if not already installed):
   ```bash
   npm install -g vercel
   ```
2. In `c:\Users\USER\Desktop\alice`, run:
   ```bash
   vercel
   ```
3. Follow the quick terminal prompts:
   - Set up and deploy? **Yes (`y`)**
   - Which scope? Select your personal account.
   - Link to existing project? **No (`n`)**
   - Project name? Press Enter (or type `yoruba-medicinal-dictionary`).
   - In which directory is your code located? `./` (Press Enter).
4. Once the preview is created, deploy to production:
   ```bash
   vercel --prod
   ```

---

## 4. How to Get a Free MongoDB Atlas Database

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a free **M0 (Shared)** cluster.
3. Under **Database Access**: Create a database user with username and password.
4. Under **Network Access**: Add IP Address `0.0.0.0/0` (Allow access from anywhere, required for cloud serverless functions).
5. Click **Connect** → **Drivers** (Node.js) and copy the connection string.
6. Replace `<username>` and `<password>` with your credentials, and paste it into Vercel's `MONGODB_URI` environment variable.

---

## 5. Live URLs to Test After Deployment

Once deployed, test your Vercel URL (e.g. `https://your-project.vercel.app`):

| Page / Feature | URL |
|---|---|
| **Main Dictionary** | `https://your-project.vercel.app/` |
| **Admin Portal** | `https://your-project.vercel.app/admin` |
| **About Page** | `https://your-project.vercel.app/about` |
| **API Health Check** | `https://your-project.vercel.app/api/health` |
| **Medicinals API** | `https://your-project.vercel.app/api/medicinals` |
| **Categories API** | `https://your-project.vercel.app/api/categories` |
| **Summary Stats API** | `https://your-project.vercel.app/api/medicinals/stats` |
