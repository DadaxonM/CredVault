# CredVault — Rollarga asoslangan foydalanuvchi va xizmat (parollar) boshqaruv tizimi

Full-stack ilova: **React + TypeScript + TailwindCSS** (frontend), **FastAPI** (backend),
**SQL** (SQLAlchemy ORM — sozlash orqali SQLite yoki PostgreSQL).

---

## 1. Tizim tuzilishi

```
project/
├── backend/     FastAPI + SQLAlchemy + JWT auth
└── frontend/    React + TypeScript + Tailwind (Vite)
```

### Ma'lumotlar bazasi jadvallari
- **roles** — `superadmin`, `admin`, `user`
- **users** — ism, familiya, otasining ismi, login, email (`*@gmail.com`), telefon (`(+998) __-___-__-__`), rol, holat (faol/disabled), `must_change_password`
- **services** — `project_name`, `login`, `password` (bazada **shifrlangan** holda saqlanadi, Fernet/AES orqali)
- **service_access** — superadmin tomonidan belgilanadigan ko'rish huquqlari (rol bo'yicha yoki aniq foydalanuvchiga)

### Ruxsatlar (permissions) matritsasi

| Amal | Superadmin | Admin | User |
|---|---|---|---|
| O'z parolini o'zgartirish | ✅ | ✅ | ✅ |
| Admin yaratish / tahrirlash / o'chirish / disable | ✅ | ❌ | ❌ |
| User yaratish / tahrirlash / o'chirish / disable | ✅ | ✅ | ❌ |
| Xizmat (service) yaratish | ✅ | ✅ | ❌ |
| Xizmatni faqat o'zi yaratganini tahrirlash/o'chirish | ✅ (barchasini) | ✅ (faqat o'zinikini) | ❌ |
| Xizmatni kimga ko'rsatishni belgilash (tick) | ✅ | ❌ | ❌ |
| Project name'ni nusxalash (copy) | ❌ (hech kimga yo'q) | ❌ | ❌ |
| Login / Password'ni nusxalash (faqat ruxsat berilganlarga) | ✅ | shart bajarilsa | shart bajarilsa |

**Muhim:** `project_name` + `login` juftligi bazada takrorlanishi mumkin emas (409 xatolik qaytadi).

### Qo'shimcha xavfsizlik funksiyalari

- **Avtomatik chiqish (idle timeout):** Har qanday rol (superadmin/admin/user) tizimga kirgach,
  **60 soniya** davomida sichqoncha/klaviatura orqali hech qanday harakat bo'lmasa, foydalanuvchi
  xavfsizlik maqsadida avtomatik ravishda tizimdan chiqariladi. Sidebar menyu ostida doimiy
  ko'rinadigan sanoqchi (countdown) harakatsizlik vaqtini real vaqtda ko'rsatib turadi va har
  qanday harakatda qaytadan 60 soniyaga tiklanadi.
- **Superadmin — email manzil:** Superadmin, parolni o'zgartirish sahifasida (shu jumladan
  birinchi majburiy kirishda), o'ziga tegishli email manzilini kiritishi/yangilashi mumkin
  (faqat `@gmail.com`). Bu — umumiy aloqa uchun; parolni tiklash endi Telegram orqali ishlaydi (pastga qarang).
- **Superadmin — Telegram bilan bog'lash:** Superadmin parolni o'zgartirish sahifasida Telegram
  hisobini bog'lay oladi: Telegramda botni topib `/start` bosadi, so'ng ilovada "Aniqlash"
  tugmasini bosib, topilgan hisobni "Tasdiqlash" orqali bog'laydi. Bog'lash bir marta amalga
  oshiriladi va keyin "Parolni unutdim" funksiyasi shu Telegram chatiga xabar yuboradi.
- **"Parolni unutdim" (faqat superadmin uchun):** Login sahifasida tugma bosilganda superadmin
  **login (username)i**ni so'rovchi oyna ochiladi. Login to'g'ri formatda kiritilgach "Yuborish"
  tugmasi faollashadi. Kiritilgan login bazadagi superadmin loginiga mos kelsa va Telegram
  bog'langan bo'lsa — yangi vaqtinchalik parol generatsiya qilinib, Telegram bot orqali
  yuboriladi va tizimga kirgach uni almashtirish majburiy bo'ladi. Mos kelmasa — xatolik ko'rsatiladi.
  > **Eslatma:** parollar bazada bir tomonlama (bcrypt) xeshlanadi, shu sababli "eski" parolni
  > tiklab bo'lmaydi — shuning uchun har doim yangi vaqtinchalik parol yaratiladi.

---

## 2. Ishga tushirish — Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # kerak bo'lsa .env ichidagi qiymatlarni tahrirlang
uvicorn app.main:app --reload --port 8000
```

Birinchi marta ishga tushganda backend avtomatik ravishda:
- 3 ta rolni (`superadmin`, `admin`, `user`) yaratadi,
- default superadmin hisobini yaratadi:
  - **login:** `superadmin`
  - **parol:** `Passwords1807*`
  - `must_change_password = true` — birinchi kirishda parolni o'zgartirish **majburiy**.

`.env` faylida:
- `DATABASE_URL` — default: `sqlite:///./app.db`. PostgreSQL uchun:
  `postgresql+psycopg2://user:password@localhost:5432/credvault` (avval `pip install psycopg2-binary` qiling).
- `ENCRYPTION_KEY` — xizmat parollarini shifrlash uchun Fernet kaliti (loyihada tayyor generatsiya qilingan holda kelmoqda; productionga chiqarishda albatta o'zingizniki bilan almashtiring:
  `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`).
- `SECRET_KEY` — JWT imzosi uchun (productionda albatta uzun random qiymatga almashtiring).
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` — "Parolni unutdim" funksiyasi orqali Telegram
  bot bilan xabar yuborish uchun. **Agar `TELEGRAM_BOT_TOKEN` bo'sh qoldirilsa**, tizim xatoga
  chiqmaydi — buning o'rniga yuboriladigan xabar matnini (shu jumladan vaqtinchalik parolni)
  backend konsoliga (terminalga) chiqaradi, shunda funksiyani real botsiz ham sinab ko'rish mumkin.

  **Bot qanday yaratiladi:**
  1. Telegramda [@BotFather](https://t.me/BotFather) bilan suhbat oching, `/newbot` yuboring.
  2. Bot uchun nom va username belgilang (username `bot` bilan tugashi shart, masalan `credvault_bot`).
  3. BotFather sizga TOKEN qaytaradi (masalan `123456789:AAExxxxx...`) — shuni `TELEGRAM_BOT_TOKEN`ga,
     username'ni esa `TELEGRAM_BOT_USERNAME`ga (masalan `credvault_bot`, `@` belgisisiz) yozing.
  4. Backendni qayta ishga tushiring.

Backend `http://127.0.0.1:8000` da ishga tushadi. Interaktiv API hujjatlari: `http://127.0.0.1:8000/docs`.

---

## 3. Ishga tushirish — Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend `http://127.0.0.1:5173` da ishga tushadi va `/api/*` so'rovlarini avtomatik ravishda
backendga (`http://127.0.0.1:8000`) proksi qiladi (`vite.config.ts` ichida sozlangan).

Productionga build qilish uchun:
```bash
npm run build
```
Natija `frontend/dist` papkasida hosil bo'ladi — istalgan static hosting yoki Nginx orqali serve qilinadi
(bu holatda backend URL manzilini `src/api/client.ts` yoki reverse-proxy orqali sozlang).

---

## 4. Foydalanish tartibi

1. `superadmin` / `Passwords1807*` bilan tizimga kiring.
2. Tizim darhol parolni o'zgartirishni so'raydi — yangi parol o'rnating. Shu sahifada:
   - o'zingizga tegishli **email manzilingizni** kiritishingiz mumkin (umumiy aloqa uchun);
   - **Telegram bilan bog'laning** — Telegramda botni topib `/start` bosing, so'ng "Aniqlash"
     tugmasini bosib, "Tasdiqlash" orqali hisobingizni bog'lang. Bu — "Parolni unutdim"
     funksiyasi ishlashi uchun **shart**.
3. **"Foydalanuvchilar"** bo'limida "Adminlar" yoki "Foydalanuvchilar" tabidan kerakli rolga
   yangi hisob yarating (ism, familiya, otasining ismi, login, email, telefon, boshlang'ich parol).
4. **"Xizmatlar (Services)"** bo'limida admin/superadmin yangi xizmat (project name, login, password)
   qo'sha oladi.
5. Superadmin har bir xizmat qatorida ⚙️ (sozlash) tugmasi orqali ushbu xizmatni **kimlar ko'rishi**
   mumkinligini belgilaydi — butun rolga (barcha admin / barcha user) yoki aniq shaxsga tick qo'yish orqali.
6. Ruxsat berilgan admin/user endi "Xizmatlar" sahifasida ushbu qatorni ko'radi va faqat
   **login** hamda **password** ustunlaridagi nusxalash (copy) tugmalari orqali ma'lumotni
   clipboard'ga nusxalay oladi. **Project name nusxalanmaydi** — faqat matn sifatida ko'rinadi.

---

## 5. Xavfsizlik eslatmalari

- Parollar `bcrypt` bilan xeshlanadi (users jadvali).
- Xizmat parollari (`services.password`) bazada **Fernet simmetrik shifrlash** bilan saqlanadi —
  API orqali faqat ruxsati bor foydalanuvchiga `/services/{id}/reveal` endpoint orqali ochiladi.
- JWT token `Authorization: Bearer` header orqali yuboriladi, muddati `.env`dagi
  `ACCESS_TOKEN_EXPIRE_MINUTES` bilan boshqariladi.
- Productionga chiqarishda: `.env` dagi `SECRET_KEY` va `ENCRYPTION_KEY`ni albatta yangilang,
  HTTPS orqali serve qiling, CORS `allow_origins`ni frontend domeningizga toraytiring
  (`backend/app/main.py`).

---

## 6. Docker orqali ishga tushirish (production/server uchun tavsiya etiladi)

Loyihada tayyor `docker-compose.yml` bor — frontend (Nginx orqali build qilingan static) va
backend (FastAPI) ikkita alohida konteynerda ishlaydi, ular o'rtasida ichki tarmoq orqali
gaplashadi. Bu — mavjud Nextcloud/Portainer stackingiz bilan **to'qnashmaydi** (alohida
docker-compose loyihasi, alohida tarmoq, boshqa portlar).

### Qadamlar

1. Loyiha kodini serverga ko'chiring (`git clone`, `scp -r` yoki zip orqali `docker` foydalanuvchi
   papkasiga yuklab, `unzip`).
2. Loyiha ildizida `.env` yarating:
   ```bash
   cd project
   cp .env.example .env
   ```
3. `.env` ichidagi `SECRET_KEY` va `ENCRYPTION_KEY`ni albatta o'zingiz generatsiya qiling
   (namunadagi qiymatlar bilan **ishlatmang**):
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(48))"
   python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
   Shu bilan birga `TELEGRAM_BOT_TOKEN` va `TELEGRAM_BOT_USERNAME`ni ham to'ldiring.
4. Build qilib ko'taring:
   ```bash
   docker compose up -d --build
   ```
   (Eski docker versiyasida: `docker-compose up -d --build`)
5. Ilova `http://server-ip:8090` da ishga tushadi (portainerdagi mavjud xizmatlar bilan
   to'qnashmasligi uchun `8090` tanlangan — `docker-compose.yml` da xohlagan portga o'zgartirishingiz mumkin).

### Nima uchun bu usul optimal

- **Qo'lda build qilib ko'chirish shart emas** — `docker compose up --build` frontend'ni
  (`npm install && npm run build`) va backend image'ini serverning o'zida, konteyner ichida
  quradi. Sizga faqat manba kodni (papkalarni) ko'chirish kifoya.
- SQLite bazasi `credvault_data` nomli **Docker volume**da saqlanadi — konteynerni qayta
  qurish/yangilashda (`--build`) ma'lumotlar yo'qolmaydi.
- Backend porti (`8000`) hostga ochiq emas — faqat frontend konteyneridagi Nginx orqali
  ichkaridan `proxy_pass` qilinadi, bu xavfsizroq.
- Bu sozlashda backend chinakam Linux konteynerida ishlagani uchun, oldingi Windows'dagi
  Telegram SSL xatosi (antivirus/korporativ tarmoq sertifikat almashtirishidan kelib chiqqan)
  odatda **o'z-o'zidan yo'qoladi** — chunki konteyner toza `python:3.12-slim` muhitida, hech
  qanday tashqi SSL interferensiyasiz ishlaydi.

### Domenga bog'lash va SSL (HTTPS)

`8090`-portni tashqi domenga chiqarish uchun mavjud Nextcloud oldida turgan reverse-proxy'ga
(yoki alohida Nginx/Caddy/Traefik'ga) yo'naltiring, masalan oddiy Nginx bilan:

```nginx
server {
    server_name credvault.sizningdomeningiz.uz;
    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

so'ng `certbot --nginx -d credvault.sizningdomeningiz.uz` orqali bepul SSL sertifikat olasiz
(Let's Encrypt). **Eslatma:** bu SSL — foydalanuvchilar brauzerdan ilovaga xavfsiz kirishi
uchun; Telegram bilan bog'liq muammoga esa yuqoridagi (4-bandda tushuntirilgan) sabab aloqador
emas edi, u avtomatik hal bo'ladi.

### Yangilash (kod o'zgargach)

```bash
git pull   # yoki yangi kodni qayta ko'chiring
docker compose up -d --build
```

### Loglarni ko'rish / muammoni aniqlash

```bash
docker compose logs -f backend
docker compose logs -f frontend
```
