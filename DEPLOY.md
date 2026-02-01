# 🚀 Panduan Deploy PetPad

Panduan lengkap untuk upload PetPad ke hosting dan membuatnya live.

---

## 📋 Persiapan Sebelum Deploy

### 1. Generate Wallet

Anda butuh 2 wallet:
- **Deployer Wallet** - untuk deploy token (butuh ETH untuk gas)
- **Platform Wallet** - untuk menerima 20% fee

```bash
# Install viem dulu
npm install viem

# Generate wallet
node -e "
const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');
const pk = generatePrivateKey();
const acc = privateKeyToAccount(pk);
console.log('Private Key:', pk);
console.log('Address:', acc.address);
"
```

⚠️ **SIMPAN PRIVATE KEY DENGAN AMAN!** Jangan share ke siapapun.

### 2. Fund Deployer Wallet

Kirim ~0.05 ETH ke deployer wallet di **Base network**:

1. Beli ETH di exchange (Binance, Coinbase, dll)
2. Bridge ke Base via https://bridge.base.org
3. Atau langsung withdraw ke Base dari exchange yang support

---

## 🌐 Opsi Hosting

### Opsi A: Railway (RECOMMENDED - Paling Mudah)

**Kelebihan:** Free tier, auto-deploy dari GitHub, mudah setup

#### Langkah-langkah:

1. **Extract dan push ke GitHub**
```bash
# Extract zip
unzip petpad-v2-complete.zip
cd petpad-v2

# Init git
git init
git add .
git commit -m "Initial PetPad"

# Buat repo baru di github.com, lalu:
git remote add origin https://github.com/USERNAME/petpad.git
git branch -M main
git push -u origin main
```

2. **Buat akun Railway**
- Buka https://railway.app
- Sign up dengan GitHub

3. **Deploy**
- Klik "New Project"
- Pilih "Deploy from GitHub repo"
- Pilih repo `petpad` Anda
- Railway akan auto-detect Dockerfile

4. **Set Environment Variables**
- Klik project Anda
- Pergi ke "Variables"
- Tambahkan:
```
DEPLOYER_PRIVATE_KEY=0xYourPrivateKey
PLATFORM_WALLET=0xYourWalletAddress
NODE_ENV=production
```

5. **Generate Domain**
- Pergi ke "Settings"
- Klik "Generate Domain"
- Atau tambahkan custom domain

6. **Done!** 🎉
- Website live di: `https://petpad-xxx.up.railway.app`

---

### Opsi B: Render

**Kelebihan:** Free tier generous, simple

#### Langkah-langkah:

1. **Push ke GitHub** (sama seperti di atas)

2. **Buat akun Render**
- Buka https://render.com
- Sign up dengan GitHub

3. **Create Web Service**
- Klik "New" → "Web Service"
- Connect GitHub repo
- Settings:
  - **Name:** petpad
  - **Runtime:** Docker
  - **Instance Type:** Free

4. **Environment Variables**
- Tambahkan di "Environment":
```
DEPLOYER_PRIVATE_KEY=0xYourPrivateKey
PLATFORM_WALLET=0xYourWalletAddress
NODE_ENV=production
```

5. **Deploy**
- Klik "Create Web Service"
- Tunggu build selesai

6. **Done!**
- Website live di: `https://petpad.onrender.com`

---

### Opsi C: VPS (DigitalOcean, Vultr, Linode)

**Kelebihan:** Full control, lebih reliable untuk production

#### Langkah-langkah:

1. **Buat VPS**
- Buka DigitalOcean/Vultr/Linode
- Create Droplet/Instance
- Pilih Ubuntu 22.04
- Minimal $5/bulan (1GB RAM)

2. **SSH ke server**
```bash
ssh root@YOUR_SERVER_IP
```

3. **Install dependencies**
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Git
apt install git -y
```

4. **Clone dan setup**
```bash
# Clone repo
git clone https://github.com/USERNAME/petpad.git
cd petpad

# Buat .env
cp .env.example .env
nano .env
# Edit dengan values Anda
```

5. **Run dengan Docker**
```bash
# Build
docker build -t petpad .

# Run
docker run -d \
  --name petpad \
  -p 80:3000 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  petpad
```

6. **Setup domain (optional)**
```bash
# Install Nginx
apt install nginx -y

# Install Certbot untuk SSL
apt install certbot python3-certbot-nginx -y

# Buat config
nano /etc/nginx/sites-available/petpad
```

Isi dengan:
```nginx
server {
    server_name petpad.xyz www.petpad.xyz;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/petpad /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Get SSL certificate
certbot --nginx -d petpad.xyz -d www.petpad.xyz
```

7. **Done!**
- Website live di: `https://petpad.xyz`

---

### Opsi D: Vercel (Static + Serverless)

⚠️ **Note:** Backend perlu di-host terpisah, Vercel hanya untuk frontend.

Untuk full stack di Vercel, perlu modifikasi ke Next.js.

---

## 🔧 Post-Deploy Checklist

Setelah deploy, pastikan:

- [ ] Website bisa diakses
- [ ] `/api/health` menunjukkan deployer configured
- [ ] `/skill.md` bisa diakses
- [ ] Dark mode toggle berfungsi
- [ ] Deployer wallet punya ETH untuk gas

---

## 🐛 Troubleshooting

### "Deployer wallet not configured"
→ Pastikan `DEPLOYER_PRIVATE_KEY` di-set dengan benar (harus mulai dengan `0x`)

### "Insufficient ETH for gas"
→ Kirim ETH ke deployer wallet di Base network

### Build gagal
→ Pastikan semua file ada dan tidak corrupt

### Website tidak bisa diakses
→ Check logs di Railway/Render dashboard

---

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DEPLOYER_PRIVATE_KEY` | ✅ | Private key untuk deploy token |
| `PLATFORM_WALLET` | ✅ | Wallet untuk menerima 20% fee |
| `NODE_ENV` | ❌ | `production` untuk prod |
| `PORT` | ❌ | Default: 3000 |
| `DATABASE_PATH` | ❌ | Default: ./data/petpad.db |
| `BASE_RPC_URL` | ❌ | Default: https://mainnet.base.org |

---

## 🎉 Selesai!

Setelah deploy, PetPad Anda siap digunakan:
- Agents bisa launch pet tokens via Moltbook
- Pixel art di-generate otomatis
- 80% fee ke agent, 20% ke Anda

Happy launching! 🐾
