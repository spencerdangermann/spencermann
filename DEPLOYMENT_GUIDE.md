# Complete Guide: Deploying Your Website to GitHub

This guide will walk you through deploying your website to GitHub step by step.

## Step 1: Install Git (if not already installed)

1. **Download Git for Windows:**
   - Go to: https://git-scm.com/download/win
   - Download the installer (it will detect your system automatically)
   - Run the installer and use the default settings (just click "Next" through all the prompts)

2. **Verify Installation:**
   - Close and reopen your terminal/PowerShell
   - Type: `git --version`
   - You should see something like "git version 2.x.x"

## Step 2: Configure Git (First Time Only)

Open PowerShell or Command Prompt and run these commands (replace with your info):

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Initialize Your Repository

1. **Open PowerShell or Command Prompt**
2. **Navigate to your website folder:**
   ```bash
   cd D:\Website
   ```

3. **Initialize Git:**
   ```bash
   git init
   ```

## Step 4: Add All Your Files

```bash
git add .
```

This adds all your files to be committed.

## Step 5: Create Your First Commit

```bash
git commit -m "Initial website setup"
```

This saves all your files with a message describing what you're doing.

## Step 6: Connect to GitHub

1. **Go to GitHub.com** and make sure you're logged in
2. **Click the "+" icon** in the top right corner
3. **Select "New repository"**
4. **Repository name:** `spencermann` (must match what you created)
5. **Description:** (optional) "My 3D printing designs website"
6. **Make sure it's set to Public** (required for free GitHub Pages)
7. **DO NOT check** "Initialize this repository with a README" (you already have files)
8. **Click "Create repository"**

## Step 7: Link Your Local Repository to GitHub

After creating the repository, GitHub will show you some commands. Use these:

```bash
git remote add origin https://github.com/YOUR_USERNAME/spencermann.git
```

**Replace `YOUR_USERNAME` with your actual GitHub username!**

For example, if your username is `spencermann`, it would be:
```bash
git remote add origin https://github.com/spencermann/spencermann.git
```

## Step 8: Push Your Code to GitHub

```bash
git branch -M main
git push -u origin main
```

You'll be prompted for your GitHub username and password. 
**Note:** If it asks for a password, you'll need to use a Personal Access Token instead of your regular password. See "GitHub Authentication" section below.

## Step 9: Enable GitHub Pages

1. **Go to your repository on GitHub** (github.com/YOUR_USERNAME/spencermann)
2. **Click on "Settings"** (top menu bar)
3. **Scroll down and click "Pages"** in the left sidebar
4. **Under "Source":**
   - Select **"Deploy from a branch"**
   - Branch: **main**
   - Folder: **/ (root)**
5. **Click "Save"**
6. **Wait a minute**, then refresh the page
7. You'll see a message like: "Your site is published at https://YOUR_USERNAME.github.io/spencermann/"

## Step 10: Set Up Custom Domain (spencermann.com)

1. **In the same Pages settings**, scroll to **"Custom domain"**
2. **Enter:** `spencermann.com`
3. **Click "Save"**
4. **Check the box** "Enforce HTTPS" (after DNS is set up)

## Step 11: Configure DNS in GoDaddy

1. **Log into your GoDaddy account**
2. **Go to "My Products"** → **"DNS"** (or "Manage DNS")
3. **Add these A records** (click "Add" for each):
   
   **Record 1:**
   - Type: **A**
   - Name: **@** (or leave blank, or enter your domain)
   - Value: **185.199.108.153**
   - TTL: 600 (or default)
   
   **Record 2:**
   - Type: **A**
   - Name: **@**
   - Value: **185.199.109.153**
   - TTL: 600
   
   **Record 3:**
   - Type: **A**
   - Name: **@**
   - Value: **185.199.110.153**
   - TTL: 600
   
   **Record 4:**
   - Type: **A**
   - Name: **@**
   - Value: **185.199.111.153**
   - TTL: 600

4. **Add a CNAME record:**
   - Type: **CNAME**
   - Name: **www**
   - Value: **YOUR_USERNAME.github.io** (replace with your GitHub username)
   - TTL: 600

5. **Save all changes**

6. **Wait 24-48 hours** for DNS to propagate (sometimes it's faster, sometimes slower)

## GitHub Authentication (If Password Doesn't Work)

GitHub no longer accepts passwords for Git operations. You need a Personal Access Token:

1. **Go to GitHub.com** → Click your profile picture → **Settings**
2. **Scroll down** → Click **"Developer settings"** (bottom left)
3. **Click "Personal access tokens"** → **"Tokens (classic)"**
4. **Click "Generate new token"** → **"Generate new token (classic)"**
5. **Give it a name:** "Website Deployment"
6. **Select expiration:** (choose how long you want it to last)
7. **Check the box:** `repo` (this gives it access to repositories)
8. **Click "Generate token"** at the bottom
9. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)
10. **Use this token as your password** when Git asks for credentials

## Troubleshooting

### "Git is not recognized"
- Make sure Git is installed
- Close and reopen your terminal/PowerShell
- Try restarting your computer

### "Repository not found"
- Check that you spelled your GitHub username correctly
- Make sure the repository exists on GitHub
- Verify you're logged into the correct GitHub account

### "Permission denied"
- Make sure you're using a Personal Access Token, not your password
- Check that the token has `repo` permissions

### Website not loading
- Wait a few minutes after enabling Pages (it takes time to build)
- Check that you selected the correct branch (main) and folder (/)
- Clear your browser cache
- Try accessing via the github.io URL first

## Future Updates

When you make changes to your website:

1. **Navigate to your folder:**
   ```bash
   cd D:\Website
   ```

2. **Add your changes:**
   ```bash
   git add .
   ```

3. **Commit with a message:**
   ```bash
   git commit -m "Added new design" 
   ```

4. **Push to GitHub:**
   ```bash
   git push
   ```

Your website will automatically update within a few minutes!

## Need Help?

- GitHub Docs: https://docs.github.com/en/pages
- Git Documentation: https://git-scm.com/doc

