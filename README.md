# Frontend Web Application (`synerry-shortener-frontend`)

แอปพลิเคชันส่วนต่อประสานผู้ใช้งาน (Frontend) พัฒนาด้วย Next.js 16 (App Router), React 19, TypeScript และ Tailwind CSS สำหรับระบบ Synerry Short URL

---

## 1. ข้อมูลการทดสอบออนไลน์ (Live Demo & Credentials)

* **URL ทดสอบระบบออนไลน์**: [https://synerry-shortener.eastasia.cloudapp.azure.com](https://synerry-shortener.eastasia.cloudapp.azure.com)
* **Administrator**: `admin@synerry.com` / `Admin@123456`
* **Standard User**: `demo@synerry.com` / `Demo@123456`

---

## 2. ลิงก์ Repositories ที่เกี่ยวข้อง (Microservices)

* **Frontend**: [https://github.com/sangketkit01/synerry-shortener-frontend](https://github.com/sangketkit01/synerry-shortener-frontend)
* **Backend API**: [https://github.com/sangketkit01/synerry-shortener-backend](https://github.com/sangketkit01/synerry-shortener-backend)
* **Analytics Engine**: [https://github.com/sangketkit01/synerry-shortener-analytic](https://github.com/sangketkit01/synerry-shortener-analytic)

---

## 3. วิธีการติดตั้งและเริ่มใช้งาน (Installation & Setup)

### ข้อกำหนดของระบบ (Prerequisites)
* Node.js v18 ขึ้นไป และ npm

### ขั้นตอนการรัน

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. ตั้งค่าไฟล์ Environment Variables
cp .env.example .env.local

# 3. เริ่มรันเซิร์ฟเวอร์ในโหมดพัฒนา
npm run dev
```

เปิดใช้งานผ่านเบราว์เซอร์ได้ที่: `http://localhost:3000`

---

## 4. สคริปต์คำสั่งที่มีให้ใช้งาน (Available Scripts)

* `npm run dev`: รันในโหมดพัฒนาด้วย Turbopack
* `npm run build`: สร้าง Production Build ที่ปรับแต่งแล้ว
* `npm start`: รันเซิร์ฟเวอร์ Production
* `npm run lint`: ตรวจสอบโค้ดด้วย ESLint
