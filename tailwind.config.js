/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'zcanner-navy': '#001f3f',
        'zcanner-sea': '#0077be',
        'zcanner-light-blue': '#add8e6',
      },
    },
  },
  plugins: [],
}
