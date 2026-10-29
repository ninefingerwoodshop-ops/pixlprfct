import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await cp('web', 'dist', { recursive: true });
await mkdir('dist/editor', { recursive: true });
await cp('web', 'dist/editor', { recursive: true });
await cp('web/project-home.html', 'dist/index.html');
console.log('Built project home and browser editor in dist/');
