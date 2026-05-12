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
    name: str
    description: str
    accent: str
    path_hint: str
    logo_path: str | None = None
    is_home: bool = False


CARDS = [
    OgCard(
        filename="home.png",
        name="RAZKOM",
        description="Small independent software studio. Focused tools for Windows.",
        accent="#58a6ff",
        path_hint="~",
        is_home=True,
    ),
    OgCard(
        filename="tapt.png",
        name="Tapt",
        description="Live keypress overlay for streamers and screencasters. One-time license, no subscription.",
        accent="#1ea5c2",
        path_hint="~/tapt",
        logo_path="assets/icons/tapt.png",
    ),
    OgCard(
        filename="authforge.png",
        name="AuthForge",
        description="Issue keys, bind to hardware, run heartbeats, and verify Ed25519-signed responses.",
        accent="#2d8a5f",
        path_hint="~/authforge",
        logo_path="assets/brands/authforge.png",
    ),
    OgCard(
        filename="blindspot.png",
        name="BlindSpot",
        description="Draw redaction boxes over any app window and keep them in place while windows move.",
        accent="#ef4444",
        path_hint="~/blindspot",
        logo_path="assets/icons/blindspot.png",
    ),
    OgCard(
        filename="filelens.png",
        name="FileLens",
        description="Right-click files to inspect hashes, strings, hex, and PE metadata in one popup.",
        accent="#d65a1f",
        path_hint="~/filelens",
        logo_path="assets/icons/filelens.png",
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


def _paste_logo(
    img: Image.Image,
    root: Path,
    logo_path: str | None,
    left: int,
    top: int,
    box_size: int,
    accent: str,
) -> None:
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [left, top, left + box_size, top + box_size],
        radius=16,
        fill="#202833",
        outline=BORDER,
        width=1,
    )

    if not logo_path:
        return

    logo_file = root / logo_path
    if logo_file.suffix.lower() == ".svg":
        # PIL does not natively decode SVG on most setups; fallback glyph.
        fallback_font = _load_font(38, monospace=True)
        draw.text((left + 30, top + 23), "AF", fill=accent, font=fallback_font)
        return

    try:
        logo = Image.open(logo_file).convert("RGBA")
    except (OSError, FileNotFoundError):
        return


    inset = 10
    target_size = box_size - (inset * 2)
    logo.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)
    px = left + (box_size - logo.width) // 2
    py = top + (box_size - logo.height) // 2
    img.paste(logo, (px, py), logo)


def _render_home(card: OgCard, draw: ImageDraw.ImageDraw, content_x: int, content_y: int, mono: ImageFont.ImageFont) -> None:
    draw.text(
        (content_x, content_y),
        f"user@razkom.com:{card.path_hint}$",
        fill=GREEN,
        font=mono,
    )
    draw.text((content_x + 338, content_y), "cat brand.txt", fill=BLUE, font=mono)

    ascii_art = [
        "██████╗  █████╗ ███████╗██╗  ██╗ ██████╗ ███╗   ███╗",
        "██╔══██╗██╔══██╗╚══███╔╝██║ ██╔╝██╔═══██╗████╗ ████║",
        "██████╔╝███████║  ███╔╝ █████╔╝ ██║   ██║██╔████╔██║",
        "██╔══██╗██╔══██║ ███╔╝  ██╔═██╗ ██║   ██║██║╚██╔╝██║",
        "██║  ██║██║  ██║███████╗██║  ██╗╚██████╔╝██║ ╚═╝ ██║",
        "╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝",
    ]
    ascii_y = content_y + 60
    ascii_line_height = mono.getbbox("M")[3] - mono.getbbox("M")[1]
    for i, line in enumerate(ascii_art):
        draw.text((content_x, ascii_y + (i * ascii_line_height)), line, fill="#ff5f56", font=mono)

    draw.text(
        (content_x, ascii_y + (len(ascii_art) * ascii_line_height) + 16),
        "> small tools. native binaries. one thing well.",
        fill=INK_2,
        font=mono,
    )


def _render_app(
    card: OgCard,
    root: Path,
    img: Image.Image,
    draw: ImageDraw.ImageDraw,
    content_x: int,
    content_y: int,
    mono: ImageFont.ImageFont,
    sans_title: ImageFont.ImageFont,
    sans_body: ImageFont.ImageFont,
) -> None:
    draw.text(
        (content_x, content_y),
        f"user@razkom.com:{card.path_hint}$",
        fill=GREEN,
        font=mono,
    )
    draw.text((content_x + 338, content_y), "open --preview", fill=BLUE, font=mono)

    logo_box_size = 100
    logo_y = content_y + 62
    _paste_logo(img, root, card.logo_path, content_x, logo_y, logo_box_size, card.accent)

    title_x = content_x + logo_box_size + 24
    title_center_y = logo_y + (logo_box_size // 2)
    draw.text((title_x, title_center_y), card.name, fill=INK, font=sans_title, anchor="lm")
    title_width = draw.textlength(card.name, font=sans_title)
    draw.text(
        (title_x + int(title_width) + 4, title_center_y),
        ".",
        fill=card.accent,
        font=sans_title,
        anchor="lm",
    )

    body_y = logo_y + logo_box_size + 28
    for i, line in enumerate(_wrap_lines(card.description, 66)):
        draw.text((content_x, body_y + i * 38), line, fill=INK_2, font=sans_body)


def render_card(card: OgCard, out_dir: Path, root: Path) -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    _draw_vertical_gradient(img, "#0d1117", "#101723")
    draw = ImageDraw.Draw(img)

    sans_title = _load_font(70)
    sans_body = _load_font(28)
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
    if card.is_home:
        _render_home(card, draw, content_x, content_y, mono)
    else:
        _render_app(card, root, img, draw, content_x, content_y, mono, sans_title, sans_body)

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
        render_card(card, out_dir, root)


if __name__ == "__main__":
    main()
