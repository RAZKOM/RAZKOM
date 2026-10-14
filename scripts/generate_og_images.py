#!/usr/bin/env python3
"""
Generate the Open Graph images (1200x630) in the site's style.

Usage:
  python scripts/generate_og_images.py [FONT_DIR]

FONT_DIR may hold JetBrainsMono.ttf and Inter.ttf (the variable fonts from
github.com/google/fonts). Without them the script falls back to Consolas and
Segoe UI, which look close but not identical to the site.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:
    raise SystemExit("Pillow is required. Install it with: python -m pip install pillow") from exc


WIDTH, HEIGHT = 1200, 630
PAD = 72

BG = "#0c0c0e"
BG_2 = "#131316"
LINE = "#26262c"
INK = "#ececee"
INK_2 = "#a3a3ab"
INK_3 = "#6e6e78"
RED = "#ff5f56"
AF = "#5cb88a"


@dataclass(frozen=True)
class Card:
    filename: str
    name: str
    tagline: str
    path: str = ""
    accent: str = RED
    logo: str | None = None
    chips: list[tuple[str, str]] = field(default_factory=list)  # (text, colour)


CARDS = [
    Card(
        filename="home.png",
        name="RAZKOM",
        tagline="Small tools. Native binaries. One thing well.",
        chips=[("authforge", AF), ("6 apps", INK_2), ("6 sdks", INK_2), ("g2-kit", INK_2), ("never subscriptions", RED)],
    ),
    Card(
        filename="tapt.png",
        name="Tapt",
        path="tapt",
        accent="#1ea5c2",
        logo="assets/brands/tapt.png",
        tagline="See every keystroke. Live, on screen, on stream. A keyboard overlay for Windows.",
        chips=[("$2.99 once", RED), ("windows", INK_2), ("rust", INK_2), ("licensed with authforge", AF)],
    ),
    Card(
        filename="hem.png",
        name="hem",
        path="hem",
        accent="#f38ba8",
        logo="assets/brands/hem.png",
        tagline="tail, but tailored. A terminal log viewer that shows where things went wrong, instant on huge files.",
        chips=[("free", INK_2), ("windows", INK_2), ("macos", INK_2), ("linux", INK_2), ("rust", INK_2)],
    ),
    Card(
        filename="blindspot.png",
        name="BlindSpot",
        path="blindspot",
        accent="#ef4444",
        logo="assets/brands/blindspot.png",
        tagline="Redaction boxes that stick to a window as it moves and resizes. Screen share without the panic.",
        chips=[("free", INK_2), ("windows", INK_2), ("rust", INK_2), ("mit", INK_2)],
    ),
    Card(
        filename="filelens.png",
        name="FileLens",
        path="filelens",
        accent="#d65a1f",
        logo="assets/icons/filelens.png",
        tagline="Right-click any file for hashes, strings, hex, PE internals and metadata.",
        chips=[("free", INK_2), ("windows", INK_2), ("rust", INK_2), ("mit", INK_2)],
    ),
    Card(
        filename="jsdecloak.png",
        name="JSDecloak",
        path="jsdecloak",
        accent="#f99e42",
        logo="assets/brands/jsdecloak.png",
        tagline="Untangle obfuscated JavaScript in your browser. Beautify, deobfuscate, rename with scope awareness.",
        chips=[("free", INK_2), ("web", INK_2), ("typescript", INK_2), ("mit", INK_2)],
    ),
    Card(
        filename="tape.png",
        name="Tape",
        path="tape",
        accent="#e86d2d",
        logo="assets/brands/tape.png",
        tagline="Pin timestamped notes to a waveform and share the review as a link. Audio stays on your device.",
        chips=[("free", INK_2), ("web", INK_2), ("mit", INK_2)],
    ),
]


class Fonts:
    def __init__(self, font_dir: Path | None) -> None:
        self.font_dir = font_dir

    def mono(self, size: int, weight: int = 400) -> ImageFont.FreeTypeFont:
        return self._load("JetBrainsMono.ttf", ["C:/Windows/Fonts/consolab.ttf" if weight >= 600 else "C:/Windows/Fonts/consola.ttf"], size, [weight])

    def sans(self, size: int, weight: int = 400) -> ImageFont.FreeTypeFont:
        return self._load("Inter.ttf", ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"], size, [min(max(size, 14), 32), weight])

    def _load(self, name, fallbacks, size, axes):
        if self.font_dir and (self.font_dir / name).exists():
            font = ImageFont.truetype(str(self.font_dir / name), size)
            try:
                font.set_variation_by_axes(axes)
            except OSError:
                pass
            return font
        for candidate in fallbacks:
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                continue
        return ImageFont.load_default()


def render_avatar(root: Path, size: int, radius: int) -> Image.Image:
    """Rasterise the pixel-grid avatar.svg crisply, with rounded corners."""
    src = (root / "assets" / "avatar.svg").read_text(encoding="utf-8")
    scale = size / 100.0
    rects = re.findall(r'<rect ([^>]*)/>', src)
    attrs = [dict(re.findall(r'(\w+)="([^"]*)"', r)) for r in rects]
    img = Image.new("RGBA", (size, size), attrs[0]["fill"])
    draw = ImageDraw.Draw(img)
    fill = re.search(r'<g fill="([^"]+)"', src).group(1)
    for a in attrs[1:]:
        x, y = float(a["x"]), float(a["y"])
        w, h = round(float(a["width"]), 1), round(float(a["height"]), 1)
        draw.rectangle((round(x * scale), round(y * scale), round((x + w) * scale) - 1, round((y + h) * scale) - 1), fill=fill)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=radius * 4, fill=255)
    img.putalpha(mask.resize((size, size), Image.LANCZOS))
    return img


def wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_chips(draw: ImageDraw.ImageDraw, chips, x: int, y: int, font) -> None:
    for text, colour in chips:
        w = int(draw.textlength(text, font=font)) + 32
        border = colour if colour != INK_2 else LINE
        draw.rounded_rectangle((x, y, x + w, y + 44), radius=22, outline=border, width=2)
        draw.text((x + 16, y + 22), text, fill=colour, font=font, anchor="lm")
        x += w + 10


def render(card: Card, root: Path, fonts: Fonts, out_dir: Path) -> None:
    img = Image.new("RGBA", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    # Subtle panel + accent rule.
    draw.rounded_rectangle((28, 28, WIDTH - 28, HEIGHT - 28), radius=28, fill=BG_2, outline="#1d1d22", width=2)
    draw.rectangle((PAD, 28, PAD + 120, 34), fill=card.accent)

    chip_font = fonts.mono(22, 500)
    url = "razkom.com" + (f"/{card.path}" if card.path else "")
    url_font = fonts.mono(26, 500)

    if card.path:
        # Brand row: avatar + RAZKOM / path
        img.alpha_composite(render_avatar(root, 52, 12), (PAD, 70))
        brand_font = fonts.mono(28, 700)
        draw.text((PAD + 68, 96), "RAZKOM", fill=INK, font=brand_font, anchor="lm")
        bw = draw.textlength("RAZKOM", font=brand_font)
        draw.text((PAD + 68 + bw + 10, 96), f"/{card.path}", fill=INK_3, font=fonts.mono(28, 400), anchor="lm")

        # Icon + name
        top = 182
        icon_size = 128
        if card.logo:
            logo = Image.open(root / card.logo).convert("RGBA")
            bbox = logo.getbbox()
            if bbox:
                logo = logo.crop(bbox)
            logo.thumbnail((icon_size, icon_size), Image.LANCZOS)
            img.alpha_composite(logo, (PAD + (icon_size - logo.width) // 2, top + (icon_size - logo.height) // 2))
        title_font = fonts.mono(96, 700)
        draw.text((PAD + icon_size + 36, top + icon_size // 2), card.name, fill=INK, font=title_font, anchor="lm")

        body_font = fonts.sans(34, 400)
        for i, line in enumerate(wrap(draw, card.tagline, body_font, WIDTH - PAD * 2 - 40)[:2]):
            draw.text((PAD, 360 + i * 48), line, fill=INK_2, font=body_font)
    else:
        size = 300
        img.alpha_composite(render_avatar(root, size, 44), (PAD, 120))
        x = PAD + size + 56
        draw.text((x, 150), card.name, fill=INK, font=fonts.mono(104, 700))
        draw.text((x, 284), "one-person software studio", fill=RED, font=fonts.mono(32, 500))
        body_font = fonts.sans(34, 400)
        for i, line in enumerate(wrap(draw, card.tagline, body_font, WIDTH - x - PAD)[:2]):
            draw.text((x, 350 + i * 48), line, fill=INK_2, font=body_font)

    # Footer: chips left, URL right.
    draw_chips(draw, card.chips, PAD, 506, chip_font)
    draw.text((WIDTH - PAD, 528), url, fill=RED, font=url_font, anchor="rm")

    out = out_dir / card.filename
    img.convert("RGB").save(out, format="PNG", optimize=True)
    print(f"generated {out.as_posix()}")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    font_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    out_dir = root / "assets" / "og"
    out_dir.mkdir(parents=True, exist_ok=True)
    fonts = Fonts(font_dir)
    for card in CARDS:
        render(card, root, fonts, out_dir)


if __name__ == "__main__":
    main()
