module.exports = {
  apps: [
    {
      name: 'ado-dad-app',
      script: 'dist/main.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.APP_CONFIG__BACKEND_PORT || 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: process.env.APP_CONFIG__BACKEND_PORT || 3000,
      },
      // PM2 Configuration
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Health monitoring
      health_check_grace_period: 3000,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      // Auto restart on file changes (development only)
      watch: process.env.NODE_ENV === 'development' ? ['dist'] : false,
      ignore_watch: ['node_modules', 'logs'],
    },
  ],
};
