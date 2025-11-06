# CI/CD Deployment Guide - Morab Flow

## Overview

This project uses **GitHub Actions** for automated deployment to Hostinger static hosting. Changes are automatically deployed to staging and production environments based on which branch you push to.

### Environments

- **Staging**: `https://testenv.morabgroup.com`
  - Deploys automatically when you push to `develop` branch
  - Use this for testing changes before going live

- **Production**: `https://morab360.morabgroup.com`
  - Deploys automatically when you push to `main` branch
  - This is the live, public-facing website

---

## What We Set Up

### 1. Environment Configuration
- Created `.env.staging` and `.env.production` files for environment-specific URLs
- Created `src/lib/config.ts` to centralize configuration
- Refactored all hardcoded URLs to use environment variables

### 2. Build Scripts
- Added `npm run build:staging` for staging builds
- Added `npm run build:prod` for production builds

### 3. SPA Routing
- Added `.htaccess` file for React Router to work properly (prevents 404s on refresh)

### 4. GitHub Actions Workflows
- **Staging workflow**: `.github/workflows/deploy-staging.yml`
  - Triggers on push to `develop` branch
  - Builds with staging environment variables
  - Deploys to Hostinger testenv folder via FTP

- **Production workflow**: `.github/workflows/deploy-production.yml`
  - Triggers on push to `main` branch
  - Builds with production environment variables
  - Deploys to Hostinger morab360 folder via FTP

### 5. GitHub Secrets
- FTP credentials for staging and production
- Environment variable values for each environment

---

## How to Deploy Changes

### Daily Workflow

#### Making Changes and Testing (Staging)

1. **Make your changes locally** in your project folder
   ```cmd
   cd "D:\MORAB GROUP LTD\morab-flow"
   ```

2. **Commit your changes**
   ```cmd
   git add .
   git commit -m "description of your changes"
   ```

3. **Push to develop branch** (deploys to staging)
   ```cmd
   git checkout develop
   git push origin develop
   ```

4. **Check GitHub Actions**
   - Go to your GitHub repo → Actions tab
   - Watch "Deploy Staging" workflow run
   - Wait for green checkmark ✅

5. **Test on staging**
   - Visit `https://testenv.morabgroup.com`
   - Test all functionality
   - **Hard refresh** (Ctrl+F5) if you don't see changes (browser cache)

#### Deploying to Production (Live Site)

**Option A: Using Pull Request (Recommended)**

1. **Create Pull Request**
   - Go to GitHub → Pull requests → New pull request
   - Base: `main`, Compare: `develop`
   - Review changes
   - Click "Create pull request"

2. **Merge Pull Request**
   - Review one more time
   - Click "Merge pull request" → "Confirm merge"

3. **Automatic deployment**
   - GitHub Actions will run "Deploy Production"
   - Visit `https://morab360.morabgroup.com` after deployment completes

**Option B: Direct Merge (Faster)**

```cmd
git checkout main
git merge develop
git push origin main
```

---

## GitHub Secrets Setup

### Required Secrets

All secrets are stored in: **GitHub → Repository → Settings → Secrets and variables → Actions → Repository secrets**

#### FTP Credentials (6 secrets)

**Staging:**
- `FTP_STAGING_SERVER` = `31.97.97.106` (IP address from Hostinger)
- `FTP_STAGING_USERNAME` = `u571621166.testenv`
- `FTP_STAGING_PASSWORD` = (your FTP password)

**Production:**
- `FTP_PROD_SERVER` = `31.97.97.106` (IP address from Hostinger)
- `FTP_PROD_USERNAME` = `u571621166.prodenv`
- `FTP_PROD_PASSWORD` = (your FTP password)

#### Environment Variables (10 secrets)

**Staging:**
- `STAGING_VITE_API_BASE` = (your backend API URL)
- `STAGING_VITE_REQUISITIONS_SCRIPT` = (your requisitions script URL)
- `STAGING_VITE_INVENTORY_SCRIPT` = (your inventory script URL)
- `STAGING_VITE_GOOGLE_SCRIPT` = (your google script URL)
- `STAGING_VITE_CRM_SCRIPT` = (your CRM script URL)

**Production:**
- `PROD_VITE_API_BASE` = (your backend API URL)
- `PROD_VITE_REQUISITIONS_SCRIPT` = (your requisitions script URL)
- `PROD_VITE_INVENTORY_SCRIPT` = (your inventory script URL)
- `PROD_VITE_GOOGLE_SCRIPT` = (your google script URL)
- `PROD_VITE_CRM_SCRIPT` = (your CRM script URL)

**Note:** If staging and production use the same URLs, you can use the same values for both sets of secrets.

---

## File Structure

```
morab-flow/
├── .github/
│   └── workflows/
│       ├── deploy-staging.yml      # Staging deployment workflow
│       └── deploy-production.yml   # Production deployment workflow
├── .env                            # Local development (not committed)
├── .env.staging                    # Local staging (not committed)
├── .env.production                 # Local production (not committed)
├── .htaccess                       # SPA routing for React Router
├── .gitignore                      # Excludes node_modules, dist, .env files
├── src/
│   └── lib/
│       └── config.ts               # Centralized configuration
└── dist/                           # Build output (not committed)
```

---

## Troubleshooting

### Changes Not Appearing on Website

**Problem:** You pushed changes but don't see them on the site.

**Solutions:**
1. **Hard refresh browser** (Ctrl+F5 or Ctrl+Shift+R)
2. **Try incognito/private window** (bypasses cache)
3. **Check GitHub Actions** - did the workflow complete successfully?
4. **Check deployment logs** - look for errors in the Actions tab

### Workflow Not Running

**Problem:** Pushed to branch but no workflow triggered.

**Solutions:**
1. **Check workflow file exists** in the branch you pushed to
2. **Check branch name** - must be exactly `develop` or `main`
3. **Check Actions tab** - might be filtered, try "All workflows"
4. **Merge main into develop** if workflow files are missing:
   ```cmd
   git checkout develop
   git merge main
   git push origin develop
   ```

### FTP Connection Errors

**Problem:** Deployment fails with FTP connection error.

**Solutions:**
1. **Verify FTP credentials** in GitHub Secrets
2. **Check FTP server IP** - should be `31.97.97.106` (not domain name)
3. **Verify FTP account exists** in Hostinger hPanel
4. **Check directory path** - workflow uses `/` (root of FTP account's locked directory)

### Build Errors

**Problem:** Build fails during deployment.

**Solutions:**
1. **Check GitHub Secrets** - all environment variables must be set
2. **Test build locally**:
   ```cmd
   npm run build:staging  # or build:prod
   ```
3. **Check for missing dependencies** in package.json
4. **Review build logs** in GitHub Actions for specific errors

### Environment Variables Not Working

**Problem:** App shows wrong URLs or network errors.

**Solutions:**
1. **Verify secrets exist** with correct names (case-sensitive)
2. **Check workflow logs** - should show `.env.staging` or `.env.production` being created
3. **Test locally** - ensure `.env.staging` and `.env.production` files exist locally
4. **Verify values** - URLs should be complete and correct

---

## Rollback Procedure

If you need to revert to a previous version:

### Option 1: Revert via GitHub (Recommended)

1. Go to GitHub → Commits
2. Find the commit you want to revert to
3. Click the commit → "Revert" button
4. Create a revert commit
5. Push to `develop` (staging) or merge to `main` (production)

### Option 2: Revert via Command Line

```cmd
# See commit history
git log --oneline

# Revert to specific commit (creates new commit)
git revert <commit-hash>

# Or reset to previous commit (destructive - use carefully)
git reset --hard <commit-hash>
git push origin <branch> --force
```

**Warning:** Force push rewrites history. Only use if you're sure.

---

## Manual Deployment (Emergency)

If GitHub Actions fails, you can deploy manually:

1. **Build locally**
   ```cmd
   npm run build:staging  # or build:prod
   ```

2. **Copy .htaccess**
   ```cmd
   copy .htaccess dist\.htaccess
   ```

3. **Zip dist folder contents**
   - Select all files inside `dist/` folder
   - Create zip file

4. **Upload to Hostinger**
   - Go to Hostinger File Manager
   - Navigate to `testenv` (staging) or `morab360` (production)
   - Upload zip → Extract
   - Ensure files are directly in folder (not nested)

---

## Best Practices

1. **Always test on staging first** before deploying to production
2. **Use Pull Requests** for production deployments (review before merge)
3. **Write clear commit messages** describing what changed
4. **Check Actions tab** after pushing to ensure deployment succeeded
5. **Hard refresh browser** after deployment to see changes
6. **Keep secrets secure** - never commit `.env` files or share secrets

---

## Quick Reference Commands

```cmd
# Switch to develop branch
git checkout develop

# Switch to main branch
git checkout main

# Make changes, commit, and push to staging
git add .
git commit -m "your message"
git push origin develop

# Merge develop into main (production)
git checkout main
git merge develop
git push origin main

# Check current branch
git branch

# View commit history
git log --oneline

# Pull latest changes
git pull origin <branch>
```

---

## Support

If you encounter issues:

1. **Check GitHub Actions logs** - detailed error messages
2. **Verify all secrets exist** in GitHub Settings
3. **Test build locally** to isolate issues
4. **Check browser console** for runtime errors
5. **Verify FTP credentials** in Hostinger hPanel

---

## Summary

**To deploy changes:**
1. Make changes locally
2. Commit and push to `develop` → deploys to staging
3. Test on staging site
4. Create PR or merge to `main` → deploys to production
5. Done! ✅

**No manual builds or uploads needed** - everything is automated! 🚀




