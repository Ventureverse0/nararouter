#!/usr/bin/env python3
"""Dependency-free icon generator for OmniRoute Desktop.

Generates:
  assets/icon.png   (256x256)  app icon
  assets/tray.png   (32x32)    tray icon
  build/icon.ico    (multi-size) installer icon

Pure stdlib (zlib + struct) - no Pillow needed.
"""
import math
import struct
import zlib
import os

BG = (13, 20, 38)
LINE = (71, 85, 105)
NODES = [(0.25, 0.25), (0.75, 0.25), (0.5, 0.75)]
NODE_COLORS = [(34, 211, 238), (129, 140, 248), (244, 114, 182)]


def _dist_pt_seg(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    c2 = vx * vx + vy * vy
    if c2 == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, (vx * wx + vy * wy) / c2))
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy))


def make_png(size):
    radius = size / 5.0
    rnode = max(2.0, size / 9.0)
    lw = max(2.0, size / 22.0)
    half = size / 2.0
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            # Signed distance to rounded rect (1px anti-aliased edge)
            qx = abs(x - half) - (half - radius)
            qy = abs(y - half) - (half - radius)
            d = math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0) - radius
            if d >= 1.0:
                row += bytes((0, 0, 0, 0))
                continue
            alpha = 1.0 if d <= -1.0 else 0.5 - d / 2.0
            col = BG
            for (nx, ny), c in zip(NODES, NODE_COLORS):
                if math.hypot(x - nx * size, y - ny * size) <= rnode:
                    col = c
                    break
            else:
                for i in range(3):
                    ax, ay = NODES[i]
                    bx, by = NODES[(i + 1) % 3]
                    if _dist_pt_seg(x, y, ax * size, ay * size, bx * size, by * size) <= lw / 2.0 + 1.0:
                        col = LINE
                        break
            row += bytes((col[0], col[1], col[2], int(round(255 * alpha))))
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def make_ico(sizes):
    pngs = [make_png(s) for s in sizes]
    header = struct.pack("<HHH", 0, 1, len(sizes))
    entries = b""
    datas = b""
    offset = 6 + 16 * len(sizes)
    for s, png in zip(sizes, pngs):
        b = s if s < 256 else 0
        entries += struct.pack("<BBBBHHII", b, b, 0, 0, 1, 32, len(png), offset)
        datas += png
        offset += len(png)
    return header + entries + datas


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    assets = os.path.join(root, "assets")
    build = os.path.join(root, "build")
    os.makedirs(assets, exist_ok=True)
    os.makedirs(build, exist_ok=True)
    with open(os.path.join(assets, "icon.png"), "wb") as f:
        f.write(make_png(256))
    with open(os.path.join(assets, "tray.png"), "wb") as f:
        f.write(make_png(32))
    with open(os.path.join(build, "icon.ico"), "wb") as f:
        f.write(make_ico([16, 24, 32, 48, 64, 128, 256]))
    print("icons written to assets/ and build/")


if __name__ == "__main__":
    main()
