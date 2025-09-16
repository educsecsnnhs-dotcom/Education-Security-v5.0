// server.js
// Cloud-ready server with MongoDB, JWT auth, and route mounting

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const ROOT = __dirname;

// Ensure runtime dirs exist
fs.mkdirSync(path.join(ROOT, 'uploads', 'enrollments'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'uploads', 'profilePics'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'exports'), { recursive: true });

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow frontend (JWT via Authorization header)
app.use(cors({
  // ✅ IMPORTANT: Replace this placeholder with your actual Render frontend URL
  origin: process.env.FRONTEND_ORIGIN || 'https://YOUR_RENDER_FRONTEND_URL.onrender.com',
  credentials: true
}));

// ------------------------------
// MongoDB Connection
// ------------------------------
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI missing in .env. Exiting...');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected, retrying...');
});

// ------------------------------
// Trust Proxy (for HTTPS on Render/Heroku)
// ------------------------------
app.set('trust proxy', 1);

// ------------------------------
// Routes Auto-Mounting (generic)
// ------------------------------
const routesDir = path.join(ROOT, 'routes');
if (fs.existsSync(routesDir)) {
  fs.readdirSync(routesDir).forEach(f => {
    if (!f.endsWith('.js')) return;
    // ✅ Exclude SSG main route from generic auto-mounting
    if (['ssg.js'].includes(f)) return;

    const base = '/' + path.basename(f, '.js');
    const router = require(path.join(routesDir, f));
    app.use('/api' + base, router);

    const plural = '/api/' + (base.slice(1) + 's');
    if (plural !== '/api' + base) {
      app.use(plural, router);
    }
  });
}

// ------------------------------
// Explicit SSG Route (only one exists in repo)
// ------------------------------
const ssgRouter = require('./routes/ssg'); // Main SSG controller routes
app.use('/api/ssg', ssgRouter);

// ------------------------------
// Compat routes for old frontend endpoints
// ------------------------------
try {
  const compat = require('./routes/compat');
  app.use('/api', compat);
} catch (err) {
  console.warn('Compat router not loaded:', err.message);
}

// ------------------------------
// Static Frontend
// ------------------------------
app.use(express.static(path.join(ROOT, 'public')));

// ------------------------------
// Unified Error Handler
// ------------------------------
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err.stack || err);
  res.status(500).json({
    message: 'Server error',
    error: err.message || String(err),
  });
});

// ------------------------------
// Fallback → login.html if exists
// ------------------------------
app.get('*', (req, res) => {
  const login = path.join(__dirname, 'public', 'html', 'index.html');
  if (fs.existsSync(login)) return res.sendFile(login);
  return res.status(404).send('Not Found');
});

// ------------------------------
// Start Server + Seed Admin
// ------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  try {
    const seed = require('./seedAdmin');
    if (typeof seed === 'function') {
      await seed();
      console.log('✅ SuperAdmin seeding complete');
    }
  } catch (err) {
    console.warn('⚠️ seedAdmin not executed:', err.message || err);
  }
});
