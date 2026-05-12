#!/usr/bin/env python3
"""
Generate terminal-themed Open Graph images for site pages.

Usage:
  python scripts/generate_og_images.py
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import textwrap

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:
    raise SystemExit(
        "Pillow is required. Install it with: python -m pip install pillow"
    ) from exc


WIDTH = 1200
HEIGHT = 630

BG = "#0d1117"
BG_2 = "#161b22"
BORDER = "#30363d"
INK = "#c9d1d9"
INK_2 = "#a0a0b0"
GREEN = "#7ee787"
BLUE = "#58a6ff"


@dataclass(frozen=True)
class OgCard:
    filename: str
    title: str
    description: str
    accent: str
    path_hint: str


CARDS = [
    OgCard(
        filename="home.png",
        title="RAZKOM - software studio",
        description="Focused Windows tools by an independent studio: Tapt, AuthForge, BlindSpot, and FileLens.",
        accent="#58a6ff",
        path_hint="~",
    ),
    OgCard(
        filename="tapt.png",
        title="Tapt - keyboard overlay for Windows",
        description="Live keypress overlay for streamers and screencasters. One-time license, no subscription.",
        accent="#1ea5c2",
        path_hint="~/tapt",
    ),
    OgCard(
        filename="authforge.png",
        title="AuthForge - software licensing API",
        description="Issue keys, bind to hardware, run heartbeats, and verify Ed25519-signed responses.",
        accent="#2d8a5f",
        path_hint="~/authforge",
    ),
    OgCard(
        filename="blindspot.png",
        title="BlindSpot - redaction overlays for Windows",
        description="Draw redaction boxes over any app window and keep them in place while windows move.",
        accent="#ef4444",
        path_hint="~/blindspot",
    ),
    OgCard(
        filename="filelens.png",
        title="FileLens - instant file inspector for Windows",
        description="Right-click files to inspect hashes, strings, hex, and PE metadata in one popup.",
        accent="#d65a1f",
        path_hint="~/filelens",
    ),
]


def _load_font(size: int, monospace: bool = False) -> ImageFont.ImageFont:
    candidates = (
        ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/cascadiamono.ttf"]
        if monospace
        else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def _draw_vertical_gradient(image: Image.Image, top: str, bottom: str) -> None:
    draw = ImageDraw.Draw(image)
    top_rgb = tuple(int(top[i : i + 2], 16) for i in (1, 3, 5))
    bot_rgb = tuple(int(bottom[i : i + 2], 16) for i in (1, 3, 5))
    for y in range(image.height):
        t = y / max(1, image.height - 1)
        color = tuple(int(top_rgb[i] + (bot_rgb[i] - top_rgb[i]) * t) for i in range(3))
        draw.line([(0, y), (image.width, y)], fill=color)


def _wrap_lines(text: str, width: int) -> list[str]:
    return textwrap.wrap(text, width=width, break_long_words=False, break_on_hyphens=False)


def render_card(card: OgCard, out_dir: Path) -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    _draw_vertical_gradient(img, "#0d1117", "#101723")
    draw = ImageDraw.Draw(img)

    sans_title = _load_font(62)
    sans_body = _load_font(30)
    mono = _load_font(24, monospace=True)
    mono_small = _load_font(20, monospace=True)

    pad = 52
    shell_x = pad
    shell_y = 64
    shell_w = WIDTH - (pad * 2)
    shell_h = HEIGHT - 128

    draw.rounded_rectangle(
        [shell_x, shell_y, shell_x + shell_w, shell_y + shell_h],
        radius=16,
        fill=BG_2,
        outline=BORDER,
        width=2,
    )

    header_h = 44
    draw.rectangle(
        [shell_x, shell_y, shell_x + shell_w, shell_y + header_h],
        fill="#1c2129",
        outline=BORDER,
        width=1,
    )
    draw.ellipse((shell_x + 16, shell_y + 14, shell_x + 28, shell_y + 26), fill="#ff5f56")
    draw.ellipse((shell_x + 34, shell_y + 14, shell_x + 46, shell_y + 26), fill="#ffbd2e")
    draw.ellipse((shell_x + 52, shell_y + 14, shell_x + 64, shell_y + 26), fill="#27c93f")
    draw.text((shell_x + 84, shell_y + 12), "user@razkom.com", fill=INK_2, font=mono_small)

    content_x = shell_x + 36
    content_y = shell_y + header_h + 28
    draw.text(
        (content_x, content_y),
        f"user@razkom.com:{card.path_hint}$",
        fill=GREEN,
        font=mono,
    )
    draw.text((content_x + 340, content_y), "share --og", fill=card.accent, font=mono)

    title_y = content_y + 64
    for i, line in enumerate(_wrap_lines(card.title, 35)):
        draw.text((content_x, title_y + i * 70), line, fill=INK, font=sans_title)

    body_start = title_y + (len(_wrap_lines(card.title, 35)) * 70) + 18
    for i, line in enumerate(_wrap_lines(card.description, 66)):
        draw.text((content_x, body_start + i * 40), line, fill=INK_2, font=sans_body)

    footer = f"> razkom.com/{card.path_hint.strip('~/')}" if card.path_hint != "~" else "> razkom.com"
    draw.text((content_x, shell_y + shell_h - 58), footer, fill=card.accent, font=mono)

    out_path = out_dir / card.filename
    img.save(out_path, format="PNG", optimize=True)
    print(f"generated {out_path.as_posix()}")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    out_dir = root / "assets" / "og"
    out_dir.mkdir(parents=True, exist_ok=True)

    for card in CARDS:
        render_card(card, out_dir)


if __name__ == "__main__":
    main()
