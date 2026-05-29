import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 旧宅门禁机器人冷色基调 + 记忆暖色点缀
        panel: "#0e1116",
        panelSoft: "#161b22",
        line: "#232a33",
        accent: "#f5a623",      // 烤红薯 / 暖记忆
        accentSoft: "#7a5a2e",
        ai: "#1b2530",          // AI 气泡
        me: "#243447",          // 玩家气泡
        rain: "#ffd23f",        // 黄雨衣
        danger: "#e5484d",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
      keyframes: {
        fadeup: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        flash: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        keyglow: {
          "0%": { boxShadow: "0 0 0 0 rgba(245,166,35,0.0)" },
          "50%": { boxShadow: "0 0 14px 2px rgba(245,166,35,0.45)" },
          "100%": { boxShadow: "0 0 0 0 rgba(245,166,35,0.0)" },
        },
      },
      animation: {
        fadeup: "fadeup 0.25s ease-out",
        flash: "flash 1s ease-in-out infinite",
        keyglow: "keyglow 1.2s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
