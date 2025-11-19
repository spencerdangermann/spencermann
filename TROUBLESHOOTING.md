# Troubleshooting: GitHub URL Redirects to GoDaddy

If `https://spencerdangermann.github.io/spencermann/` redirects to GoDaddy, something is misconfigured. Let's fix it step by step.

## Step 1: Verify Your Site is Actually Published on GitHub Pages

1. **Go to your GitHub repository:**
   - https://github.com/spencerdangermann/spencermann

2. **Check if your files are there:**
   - You should see: `index.html`, `styles.css`, `script.js`, etc.
   - If you don't see these files, they weren't pushed to GitHub

3. **Go to Settings → Pages:**
   - Make sure it says: "Your site is live at https://spencerdangermann.github.io/spencermann/"
   - If it says "not published" or shows an error, that's the problem

## Step 2: Check for Custom Domain Redirect

The redirect might be happening because:

1. **In GitHub Pages Settings:**
   - Go to Settings → Pages
   - Look at "Custom domain"
   - **Temporarily REMOVE the custom domain** (delete `spencermann.com` and save)
   - This will stop any redirects
   - Wait 2-3 minutes
   - Try accessing: `https://spencerdangermann.github.io/spencermann/` again

## Step 3: Verify Your Files Were Pushed to GitHub

If your files aren't on GitHub, the site won't work:

1. **Check your repository:**
   - Go to: https://github.com/spencerdangermann/spencermann
   - You should see all your HTML, CSS, and JS files

2. **If files are missing, push them:**
   ```powershell
   cd D:\Website
   git add .
   git commit -m "Add website files"
   git push
   ```

## Step 4: Check for CNAME File Issues

1. **In your GitHub repository, look for a file called `CNAME`**
2. **If it exists, check its contents:**
   - It should only contain: `spencermann.com`
   - If it has anything else, that might cause issues

3. **If the CNAME file is causing problems:**
   - You can temporarily delete it
   - Or edit it to remove any incorrect entries

## Step 5: Check Browser Cache/Redirects

Your browser might be caching a redirect:

1. **Clear browser cache completely:**
   - Press `Ctrl + Shift + Delete`
   - Select "All time"
   - Check "Cached images and files"
   - Click "Clear data"

2. **Try a different browser** (or incognito mode)

3. **Try accessing directly:**
   - Type the full URL: `https://spencerdangermann.github.io/spencermann/index.html`
   - This bypasses any redirects

## Step 6: Check GitHub Pages Build Status

1. **Go to your repository → Actions tab**
2. **Look for GitHub Pages deployment actions**
3. **Check if there are any errors:**
   - If there are build errors, fix them
   - The site won't work if the build fails

## Step 7: Verify Repository is Public

GitHub Pages only works with public repositories (on free accounts):

1. **Go to Settings → General**
2. **Scroll to "Danger Zone"**
3. **Make sure the repository is set to "Public"**
4. **If it's private, change it to public**

## Step 8: Check for GoDaddy Domain Forwarding

Even though this shouldn't affect the GitHub URL, check:

1. **In GoDaddy → My Products → DNS**
2. **Look for "Forwarding" section**
3. **Make sure NO forwarding is set up**
4. **If forwarding exists, delete it**

## Quick Diagnostic Checklist

Run through these checks:

- [ ] Files exist in GitHub repository (index.html, styles.css, etc.)
- [ ] GitHub Pages is enabled (Settings → Pages)
- [ ] Repository is Public
- [ ] No build errors in Actions tab
- [ ] Custom domain is temporarily removed from GitHub Pages
- [ ] Browser cache is cleared
- [ ] Tried incognito/private window
- [ ] Tried accessing index.html directly

## If Nothing Works

1. **Remove custom domain from GitHub Pages completely**
2. **Wait 5 minutes**
3. **Access: `https://spencerdangermann.github.io/spencermann/`**
4. **If it still redirects, there might be a browser extension or system-level redirect**

## Alternative: Check What's Actually Happening

1. **Open browser Developer Tools:**
   - Press `F12`
   - Go to "Network" tab
   - Try accessing the GitHub URL
   - Look at the requests - see what status codes you get (301, 302 = redirects)

2. **Check the actual response:**
   - In Network tab, click on the request
   - Look at "Response" - is it HTML from your site or from GoDaddy?

This will tell us exactly what's happening.

