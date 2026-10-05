/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#103257',      // Deep Navy from logo
          steel: '#1a507c',     // Steel Blue from logo
          silver: '#bdc1c2',    // Silver/Gray from logo
          light: '#f1f5f9',     // Slate light gray
          accent: '#eab308',    // Warm Amber for micro-highlights
          success: '#10b981',   // Emerald green
          danger: '#ef4444',    // Rose red
        }
      },
      fontFamily: {
        // Self-hosted variable font (@fontsource-variable/outfit, imported in
        // main.jsx). Inter was a fallback that never showed — Outfit covers
        // every character — so it is no longer downloaded.
        sans: ['"Outfit Variable"', 'Outfit', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #103257 0%, #1a507c 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      }
    },
  },
  plugins: [],
}
