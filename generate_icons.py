"""Generate PWA icons from alice.jpg with navy background and circular crop."""
from PIL import Image, ImageDraw
import os

SRC = "images/alice.jpg"
OUT_DIR = "icons"
os.makedirs(OUT_DIR, exist_ok=True)

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
NAVY = (15, 26, 60)       # #0f1a3c
GOLD = (196, 149, 58)     # #c4953a

src = Image.open(SRC).convert("RGBA")

# Crop to square from center-top (to get the face)
w, h = src.size
sq = min(w, h)
left = (w - sq) // 2
top = 0  # start from top to keep the face
box = (left, top, left + sq, top + sq)
src_cropped = src.crop(box)

for size in SIZES:
    # Create icon canvas with navy background
    icon = Image.new("RGBA", (size, size), NAVY + (255,))
    
    # Resize the photo
    padding = int(size * 0.08)
    inner = size - padding * 2
    photo = src_cropped.resize((inner, inner), Image.LANCZOS)
    
    # Create circular mask
    mask = Image.new("L", (inner, inner), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, inner - 1, inner - 1), fill=255)
    
    # Apply circular mask to photo
    photo.putalpha(mask)
    
    # Paste onto navy background
    icon.paste(photo, (padding, padding), photo)
    
    # Draw gold ring
    draw_icon = ImageDraw.Draw(icon)
    ring_width = max(2, int(size * 0.02))
    draw_icon.ellipse(
        (padding - ring_width, padding - ring_width,
         padding + inner + ring_width - 1, padding + inner + ring_width - 1),
        outline=GOLD, width=ring_width
    )
    
    # Save as PNG
    out_path = os.path.join(OUT_DIR, f"icon-{size}x{size}.png")
    icon.convert("RGB").save(out_path, "PNG")
    print(f"  [OK] {out_path}")

# Maskable icons (20% safe zone padding)
for size in [192, 512]:
    icon = Image.new("RGBA", (size, size), NAVY + (255,))
    
    padding = int(size * 0.2)
    inner = size - padding * 2
    photo = src_cropped.resize((inner, inner), Image.LANCZOS)
    
    mask = Image.new("L", (inner, inner), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, inner - 1, inner - 1), fill=255)
    photo.putalpha(mask)
    
    icon.paste(photo, (padding, padding), photo)
    
    draw_icon = ImageDraw.Draw(icon)
    ring_width = max(2, int(size * 0.015))
    draw_icon.ellipse(
        (padding - ring_width, padding - ring_width,
         padding + inner + ring_width - 1, padding + inner + ring_width - 1),
        outline=GOLD, width=ring_width
    )
    
    out_path = os.path.join(OUT_DIR, f"icon-maskable-{size}x{size}.png")
    icon.convert("RGB").save(out_path, "PNG")
    print(f"  [OK] {out_path}")

print("\nAll PWA icons generated successfully!")
