import { rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const generatedPaths = [
  'out',
  'admin-system/frontend/dist',
  'attendance-system/mobile-app/dist',
  'attendance-system/mobile-app/.expo',
  'uml-diagrams/out',
];

for (const relativePath of generatedPaths) {
  const target = path.resolve(root, relativePath);
  if (!target.startsWith(root + path.sep)) {
    throw new Error(`Refusing to remove path outside workspace: ${target}`);
  }

  await rm(target, { recursive: true, force: true });
  console.log(`removed ${relativePath}`);
}
