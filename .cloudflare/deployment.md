# Cloudflare Pages Deployment Guide

This project is configured to deploy to Cloudflare Pages.

## Prerequisites

1. A Cloudflare account (free tier works)
2. Wrangler CLI installed (optional, for CLI deployment)

## Deployment Methods

### Method 1: Cloudflare Pages Dashboard (Recommended)

1. **Build your project locally:**
   ```bash
   npm install
   npm run build
   ```

2. **Go to Cloudflare Dashboard:**
   - Visit https://dash.cloudflare.com
   - Navigate to **Pages** in the sidebar
   - Click **Create a project**

3. **Connect your Git repository:**
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Cloudflare to access your repositories
   - Select the `findooo` repository

4. **Configure build settings:**
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (leave as default)

5. **Environment variables (if needed):**
   - Add any environment variables in the Pages dashboard
   - For example: `GEMINI_API_KEY` if your app needs it

6. **Deploy:**
   - Click **Save and Deploy**
   - Cloudflare will automatically build and deploy your site

### Method 2: Wrangler CLI

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Build and deploy:**
   ```bash
   npm run build
   npm run deploy
   ```

   Or use the deploy script:
   ```bash
   npm run deploy
   ```

## Configuration Files

- **`public/_redirects`**: Handles SPA routing by redirecting all routes to `index.html`
- **`public/_headers`**: Sets security headers for your application
- **`wrangler.toml`**: Configuration for Wrangler CLI deployments

## Custom Domain

After deployment, you can add a custom domain:

1. Go to your project in Cloudflare Pages
2. Click on **Custom domains**
3. Add your domain
4. Follow the DNS configuration instructions

## Continuous Deployment

When using Git integration, Cloudflare Pages will automatically:
- Deploy on every push to your main branch
- Create preview deployments for pull requests
- Show build logs and deployment status

## Troubleshooting

- **404 errors on routes:** Make sure `public/_redirects` is copied to the `dist` folder during build
- **Build failures:** Check build logs in the Cloudflare dashboard
- **Environment variables:** Ensure they're set in the Pages dashboard under Settings > Environment variables

