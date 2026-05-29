"""Genera iconos PNG simples para la PWA."""
import struct, zlib, math

def make_png(size):
    # Dibuja un fondo azul con texto "CF"
    pixels = []
    cx, cy = size // 2, size // 2
    r_outer = size // 2 - 2
    for y in range(size):
        row = []
        for x in range(size):
            dist = math.sqrt((x - cx)**2 + (y - cy)**2)
            if dist <= r_outer:
                # Fondo azul #2563EB
                row += [37, 99, 235, 255]
            else:
                row += [240, 244, 248, 0]
        pixels.append(bytes(row))

    def chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    raw = b''
    for row in pixels:
        raw += b'\x00' + row

    compressed = zlib.compress(raw, 9)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

import os
out = os.path.join(os.path.dirname(__file__), 'public')
os.makedirs(out, exist_ok=True)

for sz in [192, 512]:
    with open(os.path.join(out, f'icon-{sz}.png'), 'wb') as f:
        f.write(make_png(sz))
    print(f'icon-{sz}.png generado')
