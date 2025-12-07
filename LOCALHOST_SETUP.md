# Localhost Setup Guide

## Prerequisites
- **Node.js** installed (version 16 or higher recommended)
  - Download from: https://nodejs.org/
  - Verify installation: `node --version`

## Installation Steps (Windows CMD)

### 1. Navigate to Project Directory
```cmd
cd C:\Users\nsc\Desktop\FINDO\findooo
```

### 2. Install Dependencies
```cmd
npm install
```

### 3. (Optional) Set Environment Variables
Create a `.env.local` file in the project root with:
```
VITE_API_KEY=your_gemini_api_key_here
```

**Note:** The app will work without this, but AI features (medicine suggestions) won't function.

### 4. Start Development Server
```cmd
npm run dev
```

The app will be available at: **http://localhost:5173** (or the port shown in the terminal)

## Quick Commands Summary

```cmd
cd C:\Users\nsc\Desktop\FINDO\findooo
npm install
npm run dev
```

## Troubleshooting

- **"npm is not recognized"**: Install Node.js from nodejs.org
- **Port already in use**: Vite will automatically try the next available port
- **Build errors**: Make sure you're in the correct directory and all dependencies are installed

