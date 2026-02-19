/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Production optimization: remove unused CSS classes
  safelist: [
    // Add any dynamic class names that might be missed by the purge process
    /^bg-/,
    /^text-/,
    /^p-/,
    /^m-/,
    /^w-/,
    /^h-/,
    /^flex/,
    /^grid/,
    /^rounded/,
    /^border/,
  ],
}
