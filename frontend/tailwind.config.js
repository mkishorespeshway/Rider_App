/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // important for React
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#007C91", // Teal (legacy)
          accent: "#00E5FF",  // Cyan (legacy)
          surface: "#FFFFFF", // White
          ui: "#ECEFF1",      // Soft Grey
          text: "#1A1A1A",    // Dark Black
        },
        do: {
          // Dark-Orange palette inspired by references
          bg: "#0B0B0F",
          surface: "#121317",
          muted: "#2A2B31",
          border: "#1E1F24",
          text: "#F4F4F7",
          subtext: "#B9BBC4",
          orange: "#FF6A00",
          orangeSoft: "#FF8A33",
        },
      },
      borderRadius: {
        xl: "12px",
      },
      boxShadow: {
        'orange-soft': '0 8px 24px rgba(255, 106, 0, 0.25)',
        'card-glow': '0 0 0 1px rgba(255,106,0,0.20), 0 8px 24px rgba(0,0,0,0.40)'
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,106,0,0.0)' },
          '50%': { boxShadow: '0 0 0 6px rgba(255,106,0,0.15)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        fadein: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'glow': 'glow 2.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'fadein': 'fadein 400ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
