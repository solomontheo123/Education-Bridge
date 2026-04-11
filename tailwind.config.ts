import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bridge-blue": "#2563eb",
        "bridge-blue-dark": "#1d4ed8",
        "bridge-blue-light": "#3b82f6",
      },
    },
  },
  plugins: [],
};
export default config;
