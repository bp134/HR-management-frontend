import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const source = resolve('public/staticwebapp.config.json')
const target = resolve('dist/staticwebapp.config.json')

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)
