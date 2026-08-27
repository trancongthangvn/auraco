module.exports = {
  apps: [
    {
      name: "aura-api-staging",
      cwd: "/var/www/auraco-app-staging/server",
      script: "index.js",
      env: { NODE_ENV: "production" },
    },
    {
      name: "aura-web-staging",
      cwd: "/var/www/auraco-app-staging",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3101",
      env: { NODE_ENV: "production" },
    },
    {
      name: "aura-api",
      cwd: "/var/www/auraco-app/server",
      script: "index.js",
      env: { NODE_ENV: "production" },
    },
    {
      name: "aura-web",
      cwd: "/var/www/auraco-app",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3100",
      env: { NODE_ENV: "production" },
    },
  ],
};
