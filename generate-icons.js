// Run once: node generate-icons.js
// Generates icon-192.png and icon-512.png using an HTML canvas via a headless approach.
// Since Node doesn't have canvas built-in, we write minimal valid PNGs directly.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  const w = size, h = size;
  // Raw RGBA rows: blue background (#0D57E2) with a white map-pin shape (simplified as circle)
  const rx = Math.round(size * 0.1875); // corner radius ratio

  function inRoundedRect(x, y, r) {
    if (x < r && y < r) return (x - r) ** 2 + (y - r) ** 2 <= r * r;
    if (x > w - 1 - r && y < r) return (x - (w - 1 - r)) ** 2 + (y - r) ** 2 <= r * r;
    if (x < r && y > h - 1 - r) return (x - r) ** 2 + (y - (h - 1 - r)) ** 2 <= r * r;
    if (x > w - 1 - r && y > h - 1 - r) return (x - (w - 1 - r)) ** 2 + (y - (h - 1 - r)) ** 2 <= r * r;
    return true;
  }

  // Pin shape: teardrop (circle top, pointed bottom)
  const cx = w / 2, pinTop = h * 0.195, pinR = h * 0.26;
  const holeCx = cx, holeCy = pinTop + pinR * 0.56, holeR = pinR * 0.38;
  const tipY = h * 0.828;

  function inPin(x, y) {
    const dx = x - cx, dy = y - (pinTop + pinR);
    if (dx * dx + dy * dy <= pinR * pinR) return true;
    // Triangle from circle bottom to tip
    const circleBottomY = pinTop + pinR * 2;
    if (y >= pinTop + pinR && y <= tipY) {
      const t = (y - (pinTop + pinR)) / (tipY - (pinTop + pinR));
      const halfW = pinR * (1 - t);
      if (Math.abs(x - cx) <= halfW) return true;
    }
    return false;
  }
  function inHole(x, y) {
    return (x - holeCx) ** 2 + (y - holeCy) ** 2 <= holeR * holeR;
  }

  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4);
    row[0] = 0; // filter type None
    for (let x = 0; x < w; x++) {
      const offset = 1 + x * 4;
      if (!inRoundedRect(x, y, rx)) {
        row.writeUInt32BE(0x00000000, offset); // transparent
      } else if (inPin(x, y) && !inHole(x, y)) {
        row.writeUInt32BE(0xFFFFFFFF, offset); // white pin
      } else {
        row.writeUInt32BE(0x0D57E2FF, offset); // blue bg
      }
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeBytes = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([typeBytes, data]);
    const crc = crc32(crcBuf);
    const crcOut = Buffer.alloc(4); crcOut.writeUInt32BE(crc);
    return Buffer.concat([len, typeBytes, data, crcOut]);
  }

  function crc32(buf) {
    const table = crc32.table || (crc32.table = (() => {
      const t = new Int32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
      }
      return t;
    })());
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, 'images');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPNG(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPNG(512));
console.log('Generated images/icon-192.png and images/icon-512.png');
