# Digital Dictionary of Yorùbá Traditional Medicinal Vocabulary — Backend & Admin Guide

This guide documents the full backend architecture, API endpoints, MongoDB setup, and the Admin upload portal.

---

## 1. Technology Stack

- **Runtime**: Node.js (v20+ / v25+)
- **Language**: TypeScript (`NodeNext` / ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **File Uploads**: Multer with type and size validation (15MB limit)
- **Security & Utilities**: CORS, dotenv, tsx

---

## 2. Directory Structure

```
c:\Users\USER\Desktop\alice\
├── index.html            # Client dictionary web app (PWA enabled)
├── about.html            # About Adeniyi Alice profile & research page
├── admin.html            # Dedicated Admin Data Upload & Management Portal
├── app.js                # Frontend controller (with auto-sync to backend API)
├── styles.css            # Stylesheet (navy/gold palette)
└── server/               # Backend Server
    ├── .env              # Environment configuration (Port, MongoDB URI)
    ├── .env.example      # Example environment template
    ├── package.json      # Dependencies and run scripts
    ├── tsconfig.json     # TypeScript configuration
    ├── uploads/          # Uploaded media storage
    │   ├── images/       # Uploaded medicinal illustrations
    │   └── audio/        # Uploaded native speaker pronunciation recordings
    └── src/
        ├── config/
        │   └── db.ts     # MongoDB connection setup
        ├── models/
        │   └── Medicinal.ts  # Mongoose Schema & TypeScript Interface
        ├── middlewares/
        │   └── upload.ts # Multer multi-part form upload middleware
        ├── controllers/
        │   └── medicinalController.ts # Full CRUD & stats operations
        ├── routes/
        │   └── medicinalRoutes.ts     # Express API routes
        ├── scripts/
        │   └── seed.ts   # Database seed script for 27+ dictionary entries
        └── server.ts     # Express server entry point
```

---

## 3. Getting Started

### Step 1: Configure Database (`server/.env`)
Open [server/.env](file:///c:/Users/USER/Desktop/alice/server/.env):
```env
PORT=5000

# For local MongoDB:
MONGODB_URI=mongodb://127.0.0.1:27017/yoruba_medicinal

# For MongoDB Atlas (Free Cloud Database):
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/yoruba_medicinal?retryWrites=true&w=majority

CLIENT_URL=http://localhost:3000
```

### Step 2: Seed the Database
Populate the initial 27+ Yorùbá medicinal entries into your MongoDB instance:
```bash
cd server
npm run seed
```

### Step 3: Start the Backend Server
```bash
cd server
npm run dev
```
The server will run on: `http://localhost:5000`

---

## 4. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/medicinals` | Get all entries (supports `?search=`, `?category=`, `?letter=`, `?hasAudio=`, `?hasPicture=`) |
| `GET` | `/api/medicinals/:id` | Get single entry by ID |
| `POST` | `/api/medicinals` | Create entry with multipart form (`image` and `audio` uploads) |
| `PUT` | `/api/medicinals/:id` | Update entry with optional new image/audio files |
| `DELETE` | `/api/medicinals/:id` | Delete entry and automatically removes its files from disk |
| `GET` | `/api/medicinals/stats` | Summary metrics (totals, audio count, image count, letter breakdown) |

---

## 5. Admin Upload Portal (`admin.html`)

Open [admin.html](file:///c:/Users/USER/Desktop/alice/admin.html) directly in your browser:
- **Real-Time Backend Status**: Live indicator showing if the Node/Express server on port 5000 is connected.
- **Tone-Marking Helper Keyboard**: One-click insert buttons for Yorùbá diacritics (`á, à, é, è, ẹ́, ẹ̀, í, ì, ó, ò, ọ́, ọ̀, ú, ù, n̄, ǹ`).
- **File Upload Dropzones**:
  - Image: Supports JPG, PNG, WEBP with live thumbnail preview.
  - Audio: Supports MP3, WAV, OGG, M4A with an integrated live audio player.
- **Live Search & Filter Table**: Search by Yorùbá or English text with direct Edit and Delete capabilities.
- **Client Synchronization**: Whenever a new entry is uploaded in `admin.html`, [index.html](file:///c:/Users/USER/Desktop/alice/index.html) immediately displays it with full audio and imagery!