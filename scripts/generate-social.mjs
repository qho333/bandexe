// Rebuild static Mono assets using the existing Wrangler dependency; installs nothing.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#111"/><path d="M28 32v64h16V32zm32 48v16h40V80z" fill="#eee"/></svg>`;
await writeFile('public/favicon.svg', icon);
const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#111"/><rect x="40" y="40" width="1120" height="550" fill="none" stroke="#777"/><path d="M40 102h1120M40 510h1120" stroke="#777"/>
<g fill="#eee" font-family="monospace"><text x="76" y="80" font-size="22">WRITING PRACTICE / FREE / OPEN MODELS</text><text x="70" y="258" font-size="122" font-weight="bold">BAND.EXE</text><text x="76" y="338" font-size="37">Write. Check. Try again.</text><text x="76" y="406" font-size="25" fill="#bbb">IELTS practice estimates + corrections you can check</text><text x="76" y="555" font-size="22">NO ACCOUNT NEEDED</text><text x="815" y="555" font-size="22">PRACTICE, NOT A TEST</text></g></svg>`;
await sharp(Buffer.from(preview)).png().toFile('public/og-preview.png');
await sharp(Buffer.from(icon)).resize(180).png().toFile('public/apple-touch-icon.png');
const png = await sharp(Buffer.from(icon)).resize(32).png().toBuffer();
await writeFile('public/favicon-32.png', png);
const header = Buffer.alloc(22); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4); header[6] = 32; header[7] = 32;
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
await writeFile('public/favicon.ico', Buffer.concat([header, png]));
