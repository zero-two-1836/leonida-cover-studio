#!/usr/bin/env python3
"""Screenshots for Leonida Cover Studio, drawn with Pillow.

The three covers are the app's own compositions — the same layouts,
grades, masthead, badge and barcode that app/src/render.js paints on
canvas — drawn here at export size and scaled to the screenshot limits.
The editor shot draws the studio window faithfully: browser chrome,
control rail, and the live portrait cover on stage.

Run: python3 tools/make_screenshots.py
Writes: screenshots/1-cover.jpg, 2-editor.png, 3-cover-square.jpg,
        4-cover-portrait.jpg
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "app" / "samples"
SHOTS = ROOT / "screenshots"

BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
REGULAR = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

INK = (14, 12, 18)
KEYLINE = (243, 236, 217)
CREAM = (255, 247, 234)


def font(size, bold=True):
    return ImageFont.truetype(BOLD if bold else REGULAR, int(size))


# --- gradients ---------------------------------------------------------------

def gradient(size, stops, horizontal=False):
    """An RGBA gradient image from [offset, (r, g, b, a)] stops."""
    w, h = size
    steps = w if horizontal else h
    strip = Image.new("RGBA", (steps, 1) if horizontal else (1, steps))
    px = strip.load()
    for i in range(steps):
        t = i / max(1, steps - 1)
        colour = stops[-1][1]
        for (o0, c0), (o1, c1) in zip(stops, stops[1:]):
            if o0 <= t <= o1:
                f = 0 if o1 == o0 else (t - o0) / (o1 - o0)
                colour = tuple(round(c0[k] + (c1[k] - c0[k]) * f) for k in range(4))
                break
        if horizontal:
            px[i, 0] = colour
        else:
            px[0, i] = colour
    return strip.resize((w, h))


# --- cover drawing (mirrors app/src/render.js) --------------------------------

LAYOUTS = {
    ("poster", "wide"): [
        (0.00, 0.00, 0.44, 1.00), (0.44, 0.00, 0.28, 0.50), (0.44, 0.50, 0.28, 0.50),
        (0.72, 0.00, 0.28, 0.50), (0.72, 0.50, 0.28, 0.50),
    ],
    ("poster", "portrait"): [
        (0.00, 0.00, 1.00, 0.40), (0.00, 0.40, 0.50, 0.30), (0.50, 0.40, 0.50, 0.30),
        (0.00, 0.70, 0.34, 0.30), (0.34, 0.70, 0.33, 0.30), (0.67, 0.70, 0.33, 0.30),
    ],
    ("quad", "square"): [
        (0.00, 0.00, 0.50, 0.50), (0.50, 0.00, 0.50, 0.50),
        (0.00, 0.50, 0.50, 0.50), (0.50, 0.50, 0.50, 0.50),
    ],
}

WASHES = {
    "sunset": ([(0, (255, 110, 64, 77)), (0.45, (255, 45, 120, 26)), (1, (28, 0, 58, 102))], False),
    "neon": ([(0, (255, 43, 214, 61)), (0.5, (90, 0, 140, 13)), (1, (34, 211, 238, 66))], True),
    "gold": ([(0, (255, 196, 64, 46)), (0.6, (255, 140, 40, 13)), (1, (112, 44, 0, 77))], False),
    "noir": ([(0, (0, 0, 0, 13)), (1, (0, 0, 0, 87))], False),
    "clean": ([(0, (0, 0, 0, 0)), (1, (0, 0, 0, 31))], False),
}


def cover_fit(img, box_w, box_h, fx, fy, zoom):
    scale = max(box_w / img.width, box_h / img.height) * zoom
    resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    dx = round((box_w - resized.width) * fx)
    dy = round((box_h - resized.height) * fy)
    return resized, dx, dy


def grade_photo(img, grade):
    if grade == "noir":
        return ImageOps.autocontrast(ImageOps.grayscale(img).convert("RGB"), cutoff=1)
    if grade == "sunset":
        return ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(1.28)).enhance(1.06)
    if grade == "neon":
        return ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(1.4)).enhance(1.08)
    if grade == "gold":
        return ImageEnhance.Color(img).enhance(1.15)
    return img


def draw_panel(base, box, img, grade, fx, fy, zoom):
    x, y, w, h = box
    panel = grade_photo(img, grade)
    fitted, dx, dy = cover_fit(panel, w, h, fx, fy, zoom)
    layer = Image.new("RGB", (w, h), (30, 10, 40))
    layer.paste(fitted, (dx, dy))
    stops, horizontal = WASHES[grade]
    wash = gradient((w, h), stops, horizontal)
    layer.paste(wash, (0, 0), wash)
    gloss = gradient((w, round(h * 0.55)),
                     [(0, (255, 255, 255, 31)), (1, (255, 255, 255, 0))])
    layer.paste(gloss, (0, 0), gloss)
    base.paste(layer, (x, y))
    d = ImageDraw.Draw(base)
    lw = max(3, round(w * 0.012))
    d.rectangle([x, y, x + w - 1, y + h - 1], outline=KEYLINE, width=lw)
    inset = lw + 2
    d.rectangle([x + inset, y + inset, x + w - inset - 1, y + h - inset - 1],
                outline=(10, 6, 4), width=2)


def fit_title(draw, title, max_width, start_size):
    size = start_size
    words = title.split()
    while size > 24:
        f = font(size)
        if draw.textlength(title, font=f) <= max_width:
            return [title], f, size
        best = None
        for cut in range(1, len(words)):
            lines = [" ".join(words[:cut]), " ".join(words[cut:])]
            if all(draw.textlength(line, font=f) <= max_width for line in lines):
                balance = abs(draw.textlength(lines[0], font=f) - draw.textlength(lines[1], font=f))
                if best is None or balance < best[0]:
                    best = (balance, lines)
        if best:
            return best[1], f, size
        size *= 0.92
    return [title], font(size), size


def draw_masthead(base, title, tagline):
    W, H = base.size
    scrim = gradient((W, round(H * 0.30)),
                     [(0, (8, 4, 10, 158)), (1, (8, 4, 10, 0))])
    base.paste(scrim, (0, 0), scrim)
    d = ImageDraw.Draw(base)
    kicker = "L E O N I D A   C O V E R   S T U D I O"
    kf = font(max(15, W * 0.021))
    d.text((W / 2, H * 0.048), kicker, font=kf, fill=(255, 217, 160), anchor="ms")
    lines, tf, size = fit_title(d, title, W * 0.92, W * 0.128)
    y = H * 0.062 + size
    for line in lines:
        d.text((W / 2 + size * 0.045, y + size * 0.05), line, font=tf,
               fill=(22, 10, 4), anchor="ms")
        d.text((W / 2, y), line, font=tf, fill=CREAM, anchor="ms",
               stroke_width=max(2, round(size * 0.07)), stroke_fill=(27, 15, 8))
        y += size * 1.04
    last_w = d.textlength(lines[-1], font=tf)
    bar = gradient((max(2, round(last_w)), max(3, round(size * 0.085))),
                   [(0, (255, 94, 58, 255)), (0.55, (255, 46, 136, 255)), (1, (34, 211, 238, 255))],
                   horizontal=True)
    base.paste(bar, (round(W / 2 - last_w / 2), round(y - size * 1.04 + size * 0.16)))
    if tagline:
        tf2 = font(max(16, W * 0.026))
        d.text((W * 0.032, H * 0.962), tagline.upper(), font=tf2, fill=(255, 233, 201),
               anchor="ls", stroke_width=3, stroke_fill=(10, 5, 2))


def draw_badge(base):
    W, H = base.size
    d = ImageDraw.Draw(base)
    s = round(W * 0.088)
    x, y = round(W * 0.030), round(H - s - H * 0.075)
    d.rectangle([x, y, x + s, y + s], fill=(247, 243, 232), outline=(17, 17, 17),
                width=max(3, round(s * 0.045)))
    d.text((x + s / 2, y + s * 0.50), "18+", font=font(s * 0.42), fill=(17, 17, 17), anchor="mm")
    d.text((x + s / 2, y + s * 0.74), "ADULTS ONLY", font=font(s * 0.115), fill=(17, 17, 17), anchor="mm")
    d.text((x + s / 2, y + s * 0.88), "VICE COAST", font=font(s * 0.10), fill=(17, 17, 17), anchor="mm")


def draw_barcode(base, seed_text):
    W, H = base.size
    d = ImageDraw.Draw(base)
    h = 7
    for ch in seed_text:
        h = (h * 31 + ord(ch)) % 9973
    bw, bh = round(W * 0.155), round(H * 0.052)
    x, y = W - bw - round(W * 0.030), H - bh - round(H * 0.032)
    d.rectangle([x, y, x + bw, y + bh], fill=(247, 243, 232))
    cursor = x + bw * 0.05
    n = h
    while cursor < x + bw * 0.92:
        n = (n * 37 + 11) % 89
        bar_w = 1 + (n % 4)
        if n % 3 != 0:
            d.rectangle([cursor, y + bh * 0.10, cursor + bar_w, y + bh * 0.76], fill=(17, 17, 17))
        cursor += bar_w + 2
    d.text((x + bw / 2, y + bh * 0.93), "LEONIDA No. 06", font=font(bh * 0.20),
           fill=(17, 17, 17), anchor="ms")


def draw_cover(width, height, layout_key, bucket, photos, panels, title, tagline):
    base = Image.new("RGB", (width, height), INK)
    gutter = max(6, round(width * 0.011))
    for rect, (photo_i, grade, fx, fy, zoom) in zip(LAYOUTS[(layout_key, bucket)], panels):
        box = (round(rect[0] * width + gutter / 2), round(rect[1] * height + gutter / 2),
               round(rect[2] * width - gutter), round(rect[3] * height - gutter))
        draw_panel(base, box, photos[photo_i], grade, fx, fy, zoom)
    draw_masthead(base, title, tagline)
    draw_badge(base)
    draw_barcode(base, title)
    return base


# --- the editor shot ------------------------------------------------------------

def rounded(draw, box, radius, **kwargs):
    draw.rounded_rectangle(box, radius=radius, **kwargs)


def chip(draw, x, y, text, on=False):
    f = font(15)
    w = draw.textlength(text, font=f) + 24
    if on:
        grad = gradient((round(w), 30),
                        [(0, (255, 94, 58, 255)), (1, (255, 46, 136, 255))], horizontal=True)
        return w, grad
    rounded(draw, [x, y, x + w, y + 30], 15, fill=(15, 15, 22), outline=(52, 52, 74), width=1)
    draw.text((x + 12, y + 15), text, font=f, fill=(207, 200, 184), anchor="lm")
    return w, None


def draw_editor(photos):
    W, H = 1280, 800
    base = Image.new("RGB", (W, H), (13, 13, 18))
    d = ImageDraw.Draw(base)
    # Browser chrome.
    d.rectangle([0, 0, W, 46], fill=(24, 24, 34))
    for i, colour in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([16 + i * 22, 16, 28 + i * 22, 28], fill=colour)
    rounded(d, [300, 9, 980, 37], 13, fill=(13, 13, 18))
    d.text((640, 23), "leonida-cover-studio — app/index.html (local file)",
           font=font(13, bold=False), fill=(160, 154, 140), anchor="mm")
    # App topbar.
    d.rectangle([0, 46, W, 108], fill=(19, 17, 27))
    d.rectangle([0, 105, W, 108], fill=(255, 46, 136))
    mark = gradient((52, 34), [(0, (255, 94, 58, 255)), (0.55, (255, 46, 136, 255)),
                               (1, (34, 211, 238, 255))], horizontal=True)
    base.paste(mark, (22, 60))
    d = ImageDraw.Draw(base)
    d.text((30, 77), "LCS", font=font(17), fill=CREAM, anchor="lm")
    d.text((86, 77), "Leonida Cover Studio", font=font(20), fill=CREAM, anchor="lm")
    grad_btn = gradient((150, 40), [(0, (255, 94, 58, 255)), (1, (255, 46, 136, 255))],
                        horizontal=True)
    base.paste(grad_btn, (1108, 57))
    d = ImageDraw.Draw(base)
    d.text((1183, 77), "Export PNG", font=font(16), fill=CREAM, anchor="mm")

    # Control rail.
    rail_x, rail_w = 22, 350

    def card(y, h, heading):
        rounded(d, [rail_x, y, rail_x + rail_w, y + h], 14, fill=(23, 23, 31),
                outline=(42, 42, 56), width=1)
        d.text((rail_x + 16, y + 20), heading, font=font(13), fill=(255, 217, 160), anchor="lm")
        return y

    def field(y, label, value):
        d.text((rail_x + 16, y), label, font=font(13, bold=False), fill=(207, 200, 184), anchor="lm")
        rounded(d, [rail_x + 16, y + 8, rail_x + rail_w - 16, y + 42], 9,
                fill=(15, 15, 22), outline=(52, 52, 74), width=1)
        d.text((rail_x + 26, y + 25), value, font=font(14, bold=False), fill=CREAM, anchor="lm")

    y = card(126, 168, "COVER TEXT")
    field(y + 34, "Title", "VICE HARVEST")
    field(y + 88, "Tagline", "One summer. No way back.")
    d.text((rail_x + 16, y + 148), "☑ Age badge      ☑ Barcode & issue mark",
           font=font(13, bold=False), fill=(207, 200, 184), anchor="lm")

    y = card(308, 118, "LAYOUT  ·  POST SIZE")
    x = rail_x + 16
    for text, on in [("Poster Grid", True), ("Hero Trio", False), ("Quad Split", False)]:
        w, grad = chip(d, x, y + 30, text, on)
        if grad is not None:
            base.paste(grad, (round(x), y + 30))
            d = ImageDraw.Draw(base)
            d.text((x + 12, y + 45), text, font=font(15), fill=CREAM, anchor="lm")
        x += w + 7
    x = rail_x + 16
    for text, on in [("Square", False), ("Portrait", True), ("Wide", False)]:
        w, grad = chip(d, x, y + 70, text, on)
        if grad is not None:
            base.paste(grad, (round(x), y + 70))
            d = ImageDraw.Draw(base)
            d.text((x + 12, y + 85), text, font=font(15), fill=CREAM, anchor="lm")
        x += w + 7

    y = card(440, 170, "PANEL EDITOR")
    for row in range(2):
        x = rail_x + 16
        for col in range(3):
            i = row * 3 + col
            label = f"Panel {i + 1}"
            w, grad = chip(d, x, y + 30 + row * 38, label, i == 0)
            if grad is not None:
                base.paste(grad, (round(x), y + 30 + row * 38))
                d = ImageDraw.Draw(base)
                d.text((x + 12, y + 45 + row * 38), label, font=font(15), fill=CREAM, anchor="lm")
            x += w + 6
    sy = y + 116
    for label, pct, shown in [("Focus left–right", 50, "50%"), ("Focus up–down", 38, "38%"),
                              ("Zoom", 4, "1.00×")]:
        d.text((rail_x + 16, sy), label, font=font(12, bold=False), fill=(207, 200, 184), anchor="lm")
        track_x0, track_x1 = rail_x + 128, rail_x + rail_w - 54
        d.line([track_x0, sy, track_x1, sy], fill=(52, 52, 74), width=4)
        knob_x = track_x0 + (track_x1 - track_x0) * pct / 100
        d.ellipse([knob_x - 7, sy - 7, knob_x + 7, sy + 7], fill=(255, 46, 136))
        d.text((rail_x + rail_w - 16, sy), shown, font=font(12), fill=(255, 217, 160), anchor="rm")
        sy += 18

    y = card(624, 96, "PHOTOS")
    d.text((rail_x + 16, y + 34), "1. Sample photo — boulevard", font=font(13, bold=False),
           fill=(207, 200, 184), anchor="lm")
    d.text((rail_x + 16, y + 58), "2. Sample photo — pier", font=font(13, bold=False),
           fill=(207, 200, 184), anchor="lm")
    d.text((rail_x + 16, y + 82), "+ Add your photo", font=font(13), fill=(255, 217, 160), anchor="lm")

    # Stage: the live portrait cover.
    cover = draw_cover(864, 1080, "poster", "portrait", photos,
                       [(0, "sunset", 0.5, 0.38, 1), (1, "clean", 0.5, 0.38, 1),
                        (0, "neon", 0.5, 0.38, 1), (1, "gold", 0.5, 0.38, 1),
                        (0, "sunset", 0.5, 0.38, 1), (1, "clean", 0.5, 0.38, 1)],
                       "VICE HARVEST", "One summer. No way back.")
    cover = cover.resize((452, 565), Image.LANCZOS)
    shadow = Image.new("RGB", (468, 581), (0, 0, 0))
    base.paste(shadow, (626, 128))
    base.paste(cover, (634, 136))
    d = ImageDraw.Draw(base)
    d.text((870, 730), "Samples loaded. Add your own photo, frame the panels, export the PNG.",
           font=font(14, bold=False), fill=(160, 154, 140), anchor="mm")
    return base


def save_jpeg(img, path, quality=86):
    while quality >= 60:
        img.save(path, "JPEG", quality=quality)
        if path.stat().st_size <= 262144:
            return quality
        quality -= 6
    return quality


def main():
    photos = [Image.open(SAMPLES / "boulevard.jpg").convert("RGB"),
              Image.open(SAMPLES / "pier.jpg").convert("RGB")]
    SHOTS.mkdir(exist_ok=True)

    wide = draw_cover(1920, 1080, "poster", "wide", photos,
                      [(0, "sunset", 0.5, 0.38, 1), (1, "clean", 0.5, 0.38, 1),
                       (0, "neon", 0.5, 0.38, 1), (1, "gold", 0.5, 0.38, 1),
                       (0, "sunset", 0.5, 0.38, 1)],
                      "VICE HARVEST", "One summer. No way back.")
    save_jpeg(wide.resize((1280, 720), Image.LANCZOS), SHOTS / "1-cover.jpg")

    editor = draw_editor(photos)
    editor.save(SHOTS / "2-editor.png")
    if (SHOTS / "2-editor.png").stat().st_size > 262144:
        editor.convert("RGB").save(SHOTS / "2-editor.jpg", "JPEG", quality=88)
        (SHOTS / "2-editor.png").unlink()

    square = draw_cover(1080, 1080, "quad", "square", photos,
                        [(0, "sunset", 0.5, 0.38, 1), (1, "clean", 0.5, 0.38, 1),
                         (0, "neon", 0.5, 0.38, 1), (1, "gold", 0.5, 0.38, 1)],
                        "GOLDEN HOUR", "Every sunset has a price.")
    save_jpeg(square, SHOTS / "3-cover-square.jpg")

    portrait = draw_cover(1080, 1350, "poster", "portrait", photos,
                          [(0, "sunset", 0.5, 0.04, 1), (1, "clean", 0.5, 0.38, 1),
                           (0, "neon", 0.5, 0.22, 1), (1, "gold", 0.5, 0.38, 1),
                           (0, "sunset", 0.5, 0.38, 1), (1, "clean", 0.5, 0.38, 1)],
                          "TIDE LINE", "The pier keeps every secret.")
    save_jpeg(portrait.resize((1024, 1280), Image.LANCZOS), SHOTS / "4-cover-portrait.jpg")

    for path in sorted(SHOTS.iterdir()):
        img = Image.open(path)
        print(f"{path.name}: {img.size[0]}x{img.size[1]}, {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
