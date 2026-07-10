import { cp, mkdir, rm } from 'node:fs/promises'

await rm('dist/atlas', { force: true, recursive: true })
await mkdir('dist/atlas', { recursive: true })
await cp('dist/assets', 'dist/atlas/assets', { recursive: true })
await cp('dist/index.html', 'dist/atlas/index.html')
