# Security steps for the live server

The code changes are in the repository. These steps happen on the server
(`ssh root@20.1.6.10`) and can only be done there.

## 1. Deploy the new code

```bash
cd ~/twc && git pull
cd backend && npm ci --omit=dev && pm2 restart twc-api
cd ../frontend && npm ci && npm run build && cp -r dist/* /var/www/twc/
```

Everyone is signed out once (sessions moved from the browser's storage to a
secure cookie). Sign in again.

`npm run build` now also pre-renders the home page and writes `.br`/`.gz`
copies of every file plus `dist/app.html`. Until step 3's Nginx config is in
place everything still works, but /admin and /about briefly show the home
page before switching, and files are sent uncompressed.

## 1b. Clear the sample fleet, add sample accounts (for showing the owner)

Run after step 1, from `~/twc/backend`. Back up first (step 4, or
`mongodump --out ~/backup-before-cleanup`).

```bash
npm run live-data -- status                  # what is there now
npm run live-data -- clear-vehicles          # lists the vehicles it would delete
npm run live-data -- clear-vehicles --yes    # deletes them (clients and accounts stay)
npm run live-data -- add-sample-accounts     # six months of sample accounts
pm2 restart twc-api
```

When the owner starts entering his own accounts:
`npm run live-data -- remove-sample-accounts` then `pm2 restart twc-api`.
It removes only the sample lines, never ones entered in the admin panel.

## 2. backend/.env

```bash
cd ~/twc/backend
npm run hash-password      # strong password -> ADMIN_PASSWORD_HASH=...
npm run setup-mfa          # authenticator key -> ADMIN_TOTP_SECRET=...
nano .env
```

In `.env`:

- add the `ADMIN_PASSWORD_HASH=` line and **delete** `ADMIN_PASSWORD=`
- add the `ADMIN_TOTP_SECRET=` line (after adding the key to your phone)
- make sure `JWT_SECRET` is at least 32 random characters
- make sure `NODE_ENV=production` is there
- `chmod 600 .env`

Then `pm2 restart twc-api` and check `pm2 logs twc-api --lines 30` — any
`SECURITY:` line names something still to fix.

## 3. HTTPS, HTTP/2, compression, caching and security headers (Nginx)

`deploy/nginx-site.conf` is the complete site; `deploy/nginx-headers.conf`
holds the security headers it includes everywhere.

```bash
apt install -y certbot python3-certbot-nginx
certbot certonly --nginx -d travelwithchaudhary.cloud -d www.travelwithchaudhary.cloud
apt install -y libnginx-mod-http-brotli-static libnginx-mod-http-brotli-filter   # optional, see the file
cp /etc/nginx/sites-available/twc /root/twc-nginx-backup.conf                     # keep the old one
cp ~/twc/deploy/nginx-headers.conf /etc/nginx/snippets/twc-headers.conf
cp ~/twc/deploy/nginx-site.conf /etc/nginx/sites-available/twc
nginx -t && systemctl reload nginx
```

Open the site and the admin panel once; if anything is blank, the browser
console (F12) names what the Content-Security-Policy blocked.

## 4. Backups

```bash
cp ~/twc/deploy/backup-mongo.sh /usr/local/bin/twc-backup && chmod 700 /usr/local/bin/twc-backup
mkdir -p /var/backups/twc && chmod 700 /var/backups/twc
/usr/local/bin/twc-backup            # run once now to check it works
crontab -e                           # add: 30 2 * * * /usr/local/bin/twc-backup >> /var/log/twc-backup.log 2>&1
```

Also turn on Hostinger's VPS backups/snapshots, so a copy lives off the machine.

## 5. Keep the server patched

```bash
apt update && apt upgrade -y
apt install -y unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades
ufw status          # only OpenSSH, 80, 443 should be allowed
```

MongoDB must listen on 127.0.0.1 only (`bindIp: 127.0.0.1` in
`/etc/mongod.conf`) — never on the public IP.

## 6. Watching for attacks

Security events are one JSON line each in the API's error log:

```bash
pm2 logs twc-api --err --lines 200 | grep '"sec"'
```

- `login_failed` / `login_locked` — someone guessing the password
- `auth_denied` — admin data requested without a valid session
- `csrf_blocked` — another site tried to make your browser change data
- `rate_limited`, `bot_blocked` — floods and spam bots

For alerts, point an uptime/log service (e.g. UptimeRobot for downtime,
or fail2ban on `login_locked` lines) at the server.
