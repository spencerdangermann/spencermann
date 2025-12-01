# Quick Guide: Adding Designs to Your Website

## Adding a New Design to a Category Page

### Step 1: Add Your Image
1. Save your design image (JPG or PNG recommended)
2. Place it in the appropriate folder:
   - `images/hollow-knight/` for Hollow Knight designs
   - `images/tools/` for tool designs
   - `images/games/` for game designs
   - `images/random/` for random designs

### Step 2: Get Your MakerWorld Link
1. Go to your design on MakerWorld
2. Copy the full URL (e.g., `https://makerworld.com/en/@spencermann/models/123456`)

### Step 3: Add to HTML
1. Open the appropriate category HTML file (e.g., `hollow-knight.html`)
2. Find the `.carousel-track` div
3. Add a new slide **before** the closing `</div>` tag:

```html
<div class="carousel-slide">
    <img src="images/hollow-knight/your-image-name.jpg" alt="Your Design Name" class="carousel-image">
    <div class="carousel-content">
        <h2 class="carousel-title">Your Design Name</h2>
        <p class="carousel-description">
            A brief description of your design. What makes it special? What is it used for?
        </p>
        <a href="https://makerworld.com/en/@spencermann/your-design-url" class="carousel-link" target="_blank" rel="noopener noreferrer">
            View on MakerWorld
        </a>
    </div>
</div>
```

### Step 4: That's It!
- The carousel indicators will be generated automatically
- No need to update JavaScript or CSS
- Just refresh your page to see the new design

## Tips

- **Image Size**: Recommended 1200x800px or similar aspect ratio for best display
- **File Names**: Use descriptive names like `hollow-knight-mask-v2.jpg`
- **Alt Text**: Always include descriptive alt text for SEO and accessibility
- **Descriptions**: Write 2-3 sentences describing the design and its use

## Example

Here's a complete example for a Hollow Knight mask:

```html
<div class="carousel-slide">
    <img src="images/hollow-knight/hornet-mask.jpg" alt="Hornet Mask from Hollow Knight" class="carousel-image">
    <div class="carousel-content">
        <h2 class="carousel-title">Hornet Mask</h2>
        <p class="carousel-description">
            A detailed 3D printable mask of Hornet from Hollow Knight. This design features 
            accurate proportions and is optimized for cosplay. The mask prints in multiple 
            pieces for easy assembly and painting.
        </p>
        <a href="https://makerworld.com/en/@spencermann/models/123456" class="carousel-link" target="_blank" rel="noopener noreferrer">
            View on MakerWorld
        </a>
    </div>
</div>
```

## Updating Category Thumbnails

To update the category images on the homepage:

1. Replace the image in `images/categories/`:
   - `hollow-knight.jpg`
   - `tools.jpg`
   - `games.jpg`
   - `random.jpg`

2. Recommended size: 800x600px
3. The images will automatically update on the homepage


