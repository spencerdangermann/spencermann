# Spencermann Website

A personal website showcasing 3D printing designs by Spencer Mann (Spencermann), featuring Hollow Knight cosplay masks, tools, games, and creative designs.

## Features

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **SEO Optimized**: Includes meta tags, structured data, and sitemap
- **Dark Theme**: Inspired by Hollow Knight's aesthetic
- **Interactive Carousels**: Browse designs with smooth carousel navigation
- **Category Pages**: Organized by design type (Hollow Knight, Tools, Games, Random)

## Setup Instructions

### 1. Clone or Download this Repository

If you haven't already, clone your GitHub repository:
```bash
git clone https://github.com/YOUR_USERNAME/spencermann.git
cd spencermann
```

### 2. Add Your Content

#### Images
Create the following folder structure and add your images:
```
images/
  categories/
    hollow-knight.jpg
    tools.jpg
    games.jpg
    random.jpg
  hollow-knight/
    design1.jpg
    design2.jpg
    ...
  tools/
    design1.jpg
    ...
  games/
    design1.jpg
    ...
  random/
    design1.jpg
    ...
```

#### Update HTML Files
1. **index.html**: 
   - Update the "About Me" section with your personal story
   - Replace placeholder category images

2. **Category Pages** (hollow-knight.html, tools.html, games.html, random.html):
   - Add your design images to the carousel
   - Update titles, descriptions, and MakerWorld links for each design
   - Add carousel indicators (one per design)

### 3. Deploy to GitHub Pages

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Initial website setup"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Click on **Settings**
   - Scroll down to **Pages** in the left sidebar
   - Under **Source**, select **Deploy from a branch**
   - Choose **main** branch and **/ (root)** folder
   - Click **Save**

3. **Configure Custom Domain** (spencermann.com):
   - In the same Pages settings, scroll to **Custom domain**
   - Enter `spencermann.com` and click **Save**
   - Go to your GoDaddy account and add DNS records:
     - **Type**: A
     - **Name**: @
     - **Value**: `185.199.108.153` (GitHub Pages IP)
     - Add another A record with: `185.199.109.153`
     - Add another A record with: `185.199.110.153`
     - Add another A record with: `185.199.111.153`
     - **Type**: CNAME
     - **Name**: www
     - **Value**: `YOUR_USERNAME.github.io`

4. **Wait for DNS propagation** (can take up to 48 hours)

5. **Update sitemap.xml**: Change the dates to reflect when you actually publish

## File Structure

```
spencermann/
├── index.html              # Main homepage
├── hollow-knight.html      # Hollow Knight designs page
├── tools.html              # Tools designs page
├── games.html              # Games designs page
├── random.html             # Random designs page
├── styles.css              # Main stylesheet
├── script.js               # JavaScript for carousels and navigation
├── sitemap.xml             # SEO sitemap
├── robots.txt              # Search engine instructions
├── README.md               # This file
└── images/                 # Image assets
    ├── categories/         # Category thumbnail images
    ├── hollow-knight/      # Hollow Knight design images
    ├── tools/              # Tool design images
    ├── games/              # Game design images
    └── random/             # Random design images
```

## Adding New Designs

To add a new design to a category page:

1. Add the design image to the appropriate folder (e.g., `images/hollow-knight/`)
2. Open the category HTML file
3. Inside the `.carousel-track` div, add a new `.carousel-slide` div:
   ```html
   <div class="carousel-slide">
       <img src="images/hollow-knight/your-design.jpg" alt="Design Name" class="carousel-image">
       <div class="carousel-content">
           <h2 class="carousel-title">Design Name</h2>
           <p class="carousel-description">Description of your design</p>
           <a href="https://makerworld.com/en/@spencermann/your-design-url" class="carousel-link" target="_blank" rel="noopener noreferrer">
               View on MakerWorld
           </a>
       </div>
   </div>
   ```
4. Add a new indicator button in the `.carousel-indicators` div:
   ```html
   <button class="carousel-indicator" aria-label="Slide X"></button>
   ```

## SEO Keywords

The website is optimized for:
- Spencermann
- Spencer Mann
- Hollow Knight Cosplay
- Hollow Knight Mask
- Hornet Mask
- 3D designs
- 3d Printing

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

© 2025 Spencer Mann (Spencermann). All rights reserved.

## Contact

- MakerWorld: https://makerworld.com/en/@spencermann
- All Designs: https://makerworld.com/en/@spencermann/upload

