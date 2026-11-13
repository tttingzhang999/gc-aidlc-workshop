import path from 'path';
import { fileURLToPath } from 'url';
import { bootstrap, createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = createApp({
  staticImagesDir: path.join(__dirname, '../public/images'),
});

await bootstrap();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
