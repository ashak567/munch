import { defineConfig } from 'vitest/config'
import path from 'path'
import fs from 'fs'

// Manually load .env.local for Vitest test runs to bypass Next.js's omission of .env.local in test mode
const envLocalPath = path.resolve(__dirname, '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8')
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=')
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim()
        const value = trimmed.substring(equalIndex + 1).trim()
        // Strip surrounding quotes if present
        const cleanValue = value.replace(/^['"]|['"]$/g, '')
        process.env[key] = cleanValue
      }
    }
  })
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
