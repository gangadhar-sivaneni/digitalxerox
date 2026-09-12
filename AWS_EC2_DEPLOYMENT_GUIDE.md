# AWS EC2 Deployment Guide for Digital Xerox

This guide is a deployment-only reference for the existing Digital Xerox project. It is intended to prepare the project for one AWS EC2 instance deployment without changing application source code, payment behavior, or test expectations.

Important safety notes:
- Do not deploy or create AWS resources yet.
- Do not modify payment-related code or the demo/mock Razorpay flow.
- Keep `RAZORPAY_MOCK=1` enabled.
- Do not add real Razorpay credentials, webhooks, or production payment integration.
- Do not commit or push any real `.env` file.
- Do not expose secrets in logs, screenshots, GitHub, or documentation.
- Replace all placeholders before running deployment commands.

---

## 1. AWS EC2 prerequisites

Recommended EC2 setup:
- Ubuntu 22.04 LTS or later
- 1 vCPU minimum, 2 GB RAM recommended
- At least 20 GB SSD or EBS-backed storage
- Public IP or Elastic IP for access
- Security group configured for SSH, HTTP, and HTTPS

Required packages on the EC2 instance:
- Git
- Node.js 20+
- npm
- Nginx

Minimum EC2 security groups:
- SSH: `22/tcp` from `YOUR_IP`
- HTTP: `80/tcp` from `0.0.0.0/0`
- HTTPS: `443/tcp` from `0.0.0.0/0`

Important:
- Do not expose backend port `4000` publicly.
- Route `/api` through Nginx instead.

---

## 2. Recommended operating system

Use:
- Ubuntu 22.04 LTS

This is recommended because it is well-supported for Node.js, Nginx, systemd, and long-lived app hosting.

---

## 3. Install required tools on EC2

Run the following on the EC2 instance:

```bash
sudo apt update
sudo apt install -y git nginx curl ca-certificates

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

If Node.js 20+ is already installed, you can skip the install step.

---

## 4. Create persistent storage

Use a persistent mounted directory like:

```bash
sudo mkdir -p /mnt/digitalxerox
sudo mkdir -p /mnt/digitalxerox/documents
```

Recommended persistent files:
- `/mnt/digitalxerox/db.json`
- `/mnt/digitalxerox/documents`

If you are using an attached EBS volume, mount it first and then create the directories above.

Placeholder values:
- `YOUR_EBS_DEVICE`

Example:

```bash
sudo mkfs.ext4 YOUR_EBS_DEVICE
sudo mkdir -p /mnt/digitalxerox
sudo mount YOUR_EBS_DEVICE /mnt/digitalxerox
```

Ensure the mount persists after reboot by updating `/etc/fstab`.

---

## 5. Clone the repository on EC2

From the home directory of the EC2 user:

```bash
cd ~
git clone https://github.com/gangadhar-sivaneni/digitalxerox.git
cd digitalxerox
git checkout aws-deployment-preparation
```

If you want the deployment branch only, the above branch checkout is the safe path.

---

## 6. Application directory structure

Current repository structure used by the app:

```text
project/
├── .gitignore
├── .env.local.example
├── AWS_EC2_DEPLOYMENT_GUIDE.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   ├── storage/
│   └── test/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── dist/
│   └── src/
├── LOCAL_SETUP.md
├── LOCAL_TESTING.md
├── FULL_STACK_AUDIT.md
├── README.md
└── ...
```

Important current behavior:
- Frontend uses Vite build output in `frontend/dist`
- Backend serves API on port `4000`
- Frontend uses `/api` relative requests
- Backend loads `.env` from the backend root

---

## 7. Frontend build and installation

From the project directory:

```bash
cd frontend
npm install
npm run build
```

This produces the static frontend build in:

```text
frontend/dist
```

Do not change the existing frontend build process for this deployment stage.

---

## 8. Backend installation, typecheck, and build

From the project directory:

```bash
cd backend
npm install
npm run typecheck
npm run test
npm run build
```

The current project already supports:
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm start`

Note:
- The backend tests are expected to pass after the current test-only update.
- The app must keep `RAZORPAY_MOCK=1` enabled for the demo flow.

---

## 9. Backend environment configuration

This repo already contains example environment settings in:
- `backend/.env.example`

Create a real backend environment file only on EC2, never in the repository:

```bash
cd backend
cp .env.example .env
```

Then update `.env` on the EC2 instance with placeholders only:

```env
NODE_ENV=production
PORT=4000
API_PREFIX=/api
JWT_SECRET=<generate-on-EC2>
JWT_EXPIRES_IN=7d
DB_FILE=/mnt/digitalxerox/db.json
DOC_STORAGE=/mnt/digitalxerox/documents
CORS_ORIGIN=https://YOUR_DOMAIN
RAZORPAY_MOCK=1
```

Do not add real Razorpay credentials.
Do not add real webhook secrets.
Do not commit the `.env` file.
Do not print the generated JWT secret in logs or docs.

Important:
- `JWT_SECRET` must be generated on EC2.
- Keep `RAZORPAY_MOCK=1` enabled.
- `CORS_ORIGIN` should match the deployed frontend domain.

---

## 10. Backend startup command

From the backend directory:

```bash
npm start
```

This will start the Express API on port `4000` by default.

---

## 11. Nginx configuration

Use Nginx to serve static frontend files and proxy API requests to the backend.

Example Nginx server block:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;

    access_log /var/log/nginx/digitalxerox-access.log;
    error_log /var/log/nginx/digitalxerox-error.log;

    client_max_body_size 30M;

    root /home/YOUR_USERNAME/digitalxerox/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

If HTTPS is used, add a separate TLS configuration for port `443` with Certbot or a managed certificate service.

Notes:
- The frontend uses `HashRouter`, so no special SPA fallback rewrite is required.
- `client_max_body_size 30M` is recommended because uploads are currently limited to roughly 25 MB in the backend route code.

---

## 12. systemd service for the backend

Create a systemd unit file like:

```ini
[Unit]
Description=Digital Xerox Backend
After=network.target

[Service]
WorkingDirectory=/home/YOUR_USERNAME/digitalxerox/backend
EnvironmentFile=/home/YOUR_USERNAME/digitalxerox/backend/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
StandardOutput=append:/var/log/digitalxerox-backend.log
StandardError=append:/var/log/digitalxerox-backend.log

[Install]
WantedBy=multi-user.target
```

Then reload and enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable digitalxerox-backend
sudo systemctl start digitalxerox-backend
sudo systemctl status digitalxerox-backend
```

Check logs with:

```bash
journalctl -u digitalxerox-backend -f
```

---

## 13. Nginx commands

Validate configuration:

```bash
sudo nginx -t
```

Reload after changes:

```bash
sudo nginx -s reload
```

Restart if needed:

```bash
sudo systemctl restart nginx
```

Check status:

```bash
sudo systemctl status nginx
```

---

## 14. Deployment order

Recommended deployment order:

1. Prepare EC2 instance
2. Install Node.js, Nginx, Git
3. Create persistent storage directory
4. Clone repository
5. Checkout deployment branch
6. Install frontend dependencies
7. Run frontend build
8. Install backend dependencies
9. Create environment file with placeholders only
10. Run backend typecheck/build/tests
11. Configure Nginx
12. Configure systemd service
13. Start backend
14. Start/reload Nginx
15. Verify frontend and backend through the browser and API

---

## 15. Post-deployment verification

Use the following checks after deployment:

1. Frontend loads
   - open `https://YOUR_DOMAIN`

2. Backend health works
   - `curl http://127.0.0.1:4000/api/health`
   - or access through Nginx if the reverse proxy is active

3. Login works
   - use existing demo users from the project documentation

4. Upload works
   - upload a sample document
   - verify the saved file appears in `/mnt/digitalxerox/documents`

5. Database persists
   - verify `/mnt/digitalxerox/db.json` exists and retains data after restart

6. Demo payment flow works
   - confirm the existing mock/Razorpay flow still works
   - keep `RAZORPAY_MOCK=1`

7. No real Razorpay credentials are present
   - confirm `.env` contains no real keys
   - confirm no production payment integration was added

8. Nginx works correctly
   - verify API routes are proxied correctly
   - ensure static assets load

---

## 16. Rollback plan

If deployment fails or the instance becomes unstable:

1. Stop the backend service:

```bash
sudo systemctl stop digitalxerox-backend
```

2. Stop Nginx if necessary:

```bash
sudo systemctl stop nginx
```

3. Restore the previous deployment directory or Git checkout.
4. Restore the last known-good `.env` values if needed.
5. Restore the previous persistent storage snapshot if data corruption is suspected.
6. Relaunch the previous working service configuration.

---

## 17. Backup plan

Recommended backups:
- Snapshot the EBS volume containing `/mnt/digitalxerox`
- Backup `db.json` and `documents/`
- Keep a copy of the working deployment branch and its commit hash
- Keep the last known-good Nginx config and systemd unit

---

## 18. Security checklist

Before going live:
- Confirm `RAZORPAY_MOCK=1` remains enabled
- Confirm no real Razorpay credentials exist in the environment
- Confirm `JWT_SECRET` was generated on EC2 and is stored only in the environment
- Confirm the backend port `4000` is not publicly exposed
- Confirm SSH is restricted to your IP only
- Confirm HTTP and HTTPS are the only public ports
- Confirm no real secret values are printed in terminal output or documentation

---

## 19. Safe commands versus placeholder commands

Safe commands that can be run as-is after replacing placeholders:
- `git clone ...`
- `npm install`
- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm start`
- `nginx -t`
- `systemctl daemon-reload`
- `systemctl enable ...`
- `systemctl start ...`

Commands requiring placeholder replacement:
- `server_name YOUR_DOMAIN;`
- `root /home/YOUR_USERNAME/...;`
- `CORS_ORIGIN=https://YOUR_DOMAIN`
- `YOUR_EBS_DEVICE`
- `YOUR_IP`

Commands that must not be run yet:
- `git push`
- `git push --force`
- `git reset --hard`
- `git clean -fd`
- `git rebase`
- AWS resource creation commands
- Any command that adds real production credentials

---

## 20. Current verified state of this repository

This repository has already been verified for deployment preparation:
- Frontend typecheck passed
- Frontend lint passed with one existing non-blocking warning in `OrderFlowContext.tsx`
- Frontend tests passed: 14/14
- Frontend build passed
- Backend typecheck passed
- Backend build passed
- Backend tests passed after the test-only expectation update

The current deployment branch is:
- `aws-deployment-preparation`

The current test-only GitHub update commit is:
- `8f55391 Fix stale staff admin test expectations`

No payment files, seed data, or production source files were changed during that test-only update.

---

## 21. Recommended next step

Once you explicitly approve, the next safe step would be:
- prepare the EC2 instance,
- configure the persistent mount,
- configure Nginx,
- configure systemd,
- then verify the deployed application through the browser and API.

Do not proceed to AWS deployment until you approve that next step.
