# Vercel Deployment Guide

## Why Vercel?

Vercel is the recommended platform for deploying Expo web apps because:
- ✅ Better handling of single-page applications
- ✅ Proper static file routing for Expo builds
- ✅ Automatic HTTPS and CDN
- ✅ Zero configuration deployment
- ✅ Automatic deployments from Git

## Quick Deployment Steps

### 1. Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with your GitHub account
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect it's an Expo project
6. Click "Deploy"

#### Option B: Using Vercel CLI
```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? [your-account]
# - Link to existing project? N
# - What's your project's name? todo-list-app
# - In which directory is your code located? ./
```

### 3. Configuration

The `vercel.json` file is already configured with:
- **Build Command**: `npx expo export --platform web`
- **Output Directory**: `dist`
- **SPA Routing**: All routes redirect to `index.html`
- **Static Assets**: Proper caching headers for Expo static files

### 4. Environment Variables (if needed)

If your app uses environment variables (like Supabase keys), add them in the Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add any required variables

## Automatic Deployments

Once connected to GitHub:
- Every push to `main` branch triggers automatic deployment
- Preview deployments are created for pull requests
- You can rollback to previous deployments instantly

## Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Troubleshooting

### Common Issues

1. **Build Fails**: Check the build logs in Vercel dashboard
2. **Static Files 404**: The `vercel.json` configuration should fix this
3. **Environment Variables**: Ensure they're set in Vercel dashboard

### Local Testing

Test the build locally before deploying:
```bash
# Build for web
npx expo export --platform web

# Serve the build locally
npx serve dist
```

## Benefits Over GitHub Pages

- ✅ No 404 errors for static files
- ✅ Better performance with CDN
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ✅ Better error handling
- ✅ Built-in analytics

## Migration from GitHub Pages

1. Deploy to Vercel using the steps above
2. Update your README with the new Vercel URL
3. You can keep the GitHub Pages deployment as a backup

Your app will be available at: `https://your-project-name.vercel.app` 