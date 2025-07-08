# GitHub Pages Deployment Guide

## Prerequisites

1. **GitHub Repository**: Your code must be in a GitHub repository
2. **GitHub Pages Enabled**: Enable GitHub Pages in your repository settings
3. **Actions Permissions**: Ensure GitHub Actions can write to the repository

## Setup Steps

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **Deploy from a branch**
5. Choose **gh-pages** branch and **/(root)** folder
6. Click **Save**

### 2. Configure Repository Permissions

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select **Read and write permissions**
3. Check **Allow GitHub Actions to create and approve pull requests**
4. Click **Save**

### 3. Push Your Code

The GitHub Actions workflow will automatically trigger when you push to the main branch:

```bash
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

### 4. Monitor Deployment

1. Go to **Actions** tab in your repository
2. You should see the "Deploy to GitHub Pages" workflow running
3. Wait for it to complete successfully

### 5. Access Your App

Once deployment is complete, your app will be available at:
**https://honesthomesales.github.io/TODO/**

## Troubleshooting

### Common Issues

1. **Build Fails**: Check the Actions logs for specific error messages
2. **404 Error**: Ensure the `publicPath` in `app.json` matches your repository name
3. **Assets Not Loading**: Verify all asset paths are relative

### Manual Deployment

If you need to deploy manually:

```bash
# Install dependencies
npm install

# Build for web
npx expo export --platform web

# The dist folder contains your web build
```

## Configuration Files

- `.github/workflows/deploy.yml`: GitHub Actions workflow
- `app.json`: Expo configuration with web settings
- `package.json`: Contains homepage URL for GitHub Pages

## Notes

- The app uses the `/TODO/` path as configured in your `package.json` homepage
- All builds are automatically deployed to the `gh-pages` branch
- The workflow only deploys from main/master branch pushes 