/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // important for React
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#007C91", // Teal
          accent: "#00E5FF",  // Cyan
          surface: "#FFFFFF", // White
          ui: "#ECEFF1",      // Soft Grey
          text: "#1A1A1A",    // Dark Black
        },
      },
      borderRadius: {
        xl: "12px",
      },
    },
  },
  plugins: [],
};
