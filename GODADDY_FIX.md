# Fix: GoDaddy Default Page Instead of Your Website

If you're seeing GoDaddy's default page instead of your GitHub Pages site, this is usually because GoDaddy has a default website/hosting service enabled that's overriding your DNS settings.

## Solution: Disable GoDaddy Website/Hosting

### Step 1: Check Your GoDaddy Products

1. **Log into GoDaddy**
2. Go to **"My Products"**
3. Look for **spencermann.com** in your list
4. Check if you see any of these services enabled:
   - **"Website Builder"**
   - **"Web Hosting"**
   - **"Managed WordPress"**
   - **"GoDaddy Website"**

### Step 2: Disable or Remove Website Services

If you see any website/hosting services:

1. **Click on the service** (Website Builder, Web Hosting, etc.)
2. Look for options like:
   - **"Cancel"** or **"Cancel Subscription"**
   - **"Remove"** or **"Delete"**
   - **"Disable"**
3. **Cancel/Remove the service** (this won't affect your domain, just the hosting)

**Important:** You only need the **domain** (spencermann.com), not any hosting services. GitHub Pages is your hosting.

### Step 3: Verify DNS Records Are Correct

Even if DNS check passed, let's double-check:

1. In GoDaddy, go to **My Products** → **DNS** for spencermann.com
2. Make sure you have:
   - **4 A records** with Name = `@` pointing to GitHub IPs
   - **1 CNAME** with Name = `www` pointing to `spencerdangermann.github.io`
3. **Remove any conflicting records:**
   - Delete any A records pointing to GoDaddy IPs
   - Delete any CNAME records for `@` (you can't have both A and CNAME for @)

### Step 4: Clear DNS Cache

After making changes, clear your local DNS cache:

**Windows PowerShell (Run as Administrator):**
```powershell
ipconfig /flushdns
```

**Or restart your computer** (this also clears DNS cache)

### Step 5: Verify Your Site Works on GitHub URL First

Before checking spencermann.com, verify your site works on GitHub's URL:

1. Go to: `https://spencerdangermann.github.io/spencermann/`
2. You should see your website
3. If this doesn't work, the issue is with GitHub Pages, not DNS

### Step 6: Wait and Test Again

1. **Wait 10-30 minutes** after disabling GoDaddy services
2. **Clear your browser cache** (Ctrl+Shift+Delete, or Ctrl+F5 to hard refresh)
3. Try visiting `https://spencermann.com` again
4. Try in an **incognito/private window** to bypass cache

## Alternative: Check GoDaddy Domain Forwarding

Sometimes GoDaddy has domain forwarding enabled:

1. In GoDaddy, go to **My Products** → **DNS** for spencermann.com
2. Look for **"Forwarding"** section
3. If forwarding is enabled, **disable it** or **delete the forwarding rule**

## Still Not Working?

### Check What DNS Actually Points To

Use these tools to verify DNS:

1. **Command Prompt/PowerShell:**
   ```powershell
   nslookup spencermann.com
   ```
   Should show the GitHub IPs (185.199.108.x, 185.199.109.x, etc.)

2. **Online Tool:**
   - Go to: https://www.whatsmydns.net
   - Enter: `spencermann.com`
   - Select: **A record**
   - Should show GitHub IPs globally

### If DNS Shows GoDaddy IPs

If nslookup shows GoDaddy IPs instead of GitHub IPs:
- Your DNS records aren't correct
- Go back to Step 3 and fix the A records
- Wait for DNS to propagate again

### If DNS Shows GitHub IPs But Site Still Wrong

1. **Check GitHub Pages Settings:**
   - Go to your GitHub repo → Settings → Pages
   - Make sure custom domain shows: `spencermann.com`
   - Make sure it says "DNS check successful"

2. **Check for CNAME file:**
   - GitHub should have created a `CNAME` file in your repo
   - Go to your GitHub repo
   - Look for a file called `CNAME`
   - It should contain: `spencermann.com`

3. **Try accessing with www:**
   - Try: `https://www.spencermann.com`
   - This uses the CNAME record

## Quick Checklist

- [ ] Disabled GoDaddy Website Builder/Hosting
- [ ] DNS records point to GitHub IPs (verified with nslookup)
- [ ] Site works on github.io URL
- [ ] Cleared browser cache
- [ ] Waited 30+ minutes after changes
- [ ] Tried incognito/private window
- [ ] GitHub Pages shows DNS check successful

## Contact GoDaddy Support (If Needed)

If nothing works, contact GoDaddy support:
- They can help disable any hidden services
- They can verify your DNS is set up correctly
- Phone: 1-480-505-8877
- Or use their online chat


