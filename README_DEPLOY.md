Deployment (Node + Postgres on Droplet)

1) Environment
Create a .env file in the project root with keys:

PORT=3000
CORS_ORIGIN=https://yourdomain.com,http://localhost:3000
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
PGSSL=require
PRICE_CENTS=14900

2) Install & Run
On the droplet:
sudo apt update -y && sudo apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

In project folder:
npm install
npm run start

Visit http://YOUR_SERVER_IP:3000

3) Systemd service (optional)
Create /etc/systemd/system/glidenav.service:

[Unit]
Description=GlideNav server
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/glidenav
EnvironmentFile=/var/www/glidenav/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target

Then:
sudo systemctl daemon-reload
sudo systemctl enable glidenav --now

4) Nginx reverse proxy (optional)

server {
  listen 80;
  server_name yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

Reload Nginx: sudo systemctl reload nginx


