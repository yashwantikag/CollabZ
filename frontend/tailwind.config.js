/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brandBg: '#090a0f',        // Pitch black slate canvas background
        brandCard: '#12141c',      // Sleek deep charcoal for containers and sidebars
        brandPrimary: '#10b981',   // Emerald Matrix Green for active highlights, text-links, and icons
        brandSuccess: '#22c55e',   // Bright neon green for badges (like Encrypted shield)
        brandText: '#f8fafc'       // Crisp off-white for premium text readability
      }
    },
  },
  plugins: [],
}

