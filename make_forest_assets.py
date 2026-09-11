import base64
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

OUT = Path(__file__).parent / "assets"
SOURCE = OUT / "forest-reference.png"
CROP = (70, 66, 870, 866)


def polygon_layer(source, points, kind):
    polygon = Image.new("L", source.size)
    ImageDraw.Draw(polygon).polygon(points, fill=255)
    pixels = source.load()
    alpha = Image.new("L", source.size)
    target = alpha.load()
    region = polygon.load()
    for y in range(source.height):
        for x in range(source.width):
            if not region[x, y]:
                continue
            r, g, b = pixels[x, y]
            if kind == "butterfly":
                strength = max(0, min(255, (min(r, g) - 115) * 3))
                if b > g + 30 and r < 170:
                    strength = 0
            else:
                colored = max(0, min(255, (min(r, g) - b - 5) * 5))
                white = max(0, min(255, (min(r, g, b) - 205) * 5))
                strength = max(colored, white)
            target[x, y] = strength
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.6))
    layer = Image.new("RGBA", source.size)
    layer.paste(source, mask=alpha)
    return layer, alpha


def main():
    OUT.mkdir(exist_ok=True)
    source = Image.open(SOURCE).convert("RGB").crop(CROP)
    source.save(OUT / "forest-source.png", optimize=True)
    shapes = {
        "butterfly-full": [(300, 130), (309, 115), (430, 136), (470, 81), (508, 32), (529, 30), (565, 71), (580, 122), (573, 164), (633, 178), (665, 192), (691, 229), (680, 269), (638, 308), (552, 321), (533, 353), (517, 416), (470, 416), (468, 351), (436, 317), (412, 261), (339, 221), (305, 169)],
        "wing-left": [(489, 220), (430, 136), (309, 115), (300, 130), (305, 169), (339, 221), (412, 261), (460, 243), (505, 257)],
        "wing-top": [(503, 253), (465, 148), (470, 81), (508, 32), (529, 30), (565, 71), (580, 122), (573, 164), (536, 216)],
        "wing-right": [(510, 245), (588, 179), (633, 178), (665, 192), (691, 229), (680, 269), (638, 308), (594, 308), (544, 271)],
        "wing-lower": [(500, 245), (552, 286), (550, 321), (533, 353), (498, 364), (468, 351), (436, 317), (433, 287), (456, 258)],
        "butterfly-body": [(493, 223), (518, 225), (529, 272), (517, 321), (499, 416), (470, 416), (481, 341), (470, 299), (480, 263)],
        "flower": [(87, 298), (104, 277), (136, 271), (160, 300), (190, 294), (226, 310), (250, 350), (229, 387), (207, 419), (172, 462), (132, 452), (120, 416), (90, 407), (74, 375)],
    }
    masks = []
    for name, points in shapes.items():
        kind = "flower" if name == "flower" else "butterfly"
        layer, mask = polygon_layer(source, points, kind)
        layer.save(OUT / f"forest-{name}.png", optimize=True)
        masks.append(mask)
    removal = Image.new("L", source.size)
    for mask in masks:
        removal = ImageChops.lighter(removal, mask)
    removal = removal.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(13))
    mirrored = ImageOps.mirror(source).filter(ImageFilter.GaussianBlur(7))
    clean = Image.composite(mirrored, source, removal)
    backdrop = clean.copy()
    src_pixels = clean.load()
    dst_pixels = backdrop.load()
    center_x, center_y, inner_radius = 403, 410, 253
    for y in range(source.height):
        for x in range(source.width):
            dx, dy = x - center_x, y - center_y
            distance = math.hypot(dx, dy)
            if distance >= inner_radius:
                continue
            if distance < 1:
                sample_x, sample_y = center_x, center_y - inner_radius
            else:
                scale = inner_radius / distance
                sample_x = round(center_x + dx * scale)
                sample_y = round(center_y + dy * scale)
            dst_pixels[x, y] = src_pixels[sample_x, sample_y]
    backdrop = backdrop.filter(ImageFilter.GaussianBlur(2.2))
    backdrop.save(OUT / "forest-backdrop.png", optimize=True)
    glass = clean.convert("RGBA")
    hole = Image.new("L", source.size, 255)
    ImageDraw.Draw(hole).ellipse((136, 143, 670, 677), fill=0)
    hole = hole.filter(ImageFilter.GaussianBlur(8))
    glass.putalpha(hole)
    glass.save(OUT / "forest-glass.png", optimize=True)
    names = ["glass", "backdrop"]
    entries = []
    for name in names:
        data = base64.b64encode((OUT / f"forest-{name}.png").read_bytes()).decode("ascii")
        entries.append(f'"{name}":"data:image/png;base64,{data}"')
    (Path(__file__).parent / "forest-assets.js").write_text("window.ForestAssetData={" + ",".join(entries) + "};\n", encoding="ascii")


if __name__ == "__main__":
    main()
