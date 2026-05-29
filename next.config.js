const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 用户主目录里另有一个 package-lock.json,会让 Next 误判 workspace root。
  // 固定到本项目目录消除该警告。
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
