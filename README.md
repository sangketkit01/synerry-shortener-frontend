# Synerry Corporation — Developer Examination: Enterprise Short URL & Analytics Platform
## Frontend Web Application (`synerry-shortener-frontend`)

แอปพลิเคชันส่วนต่อประสานผู้ใช้งาน (Frontend Web Application) พัฒนาด้วย Next.js 16 (App Router, Turbopack), React 19, TypeScript และ Tailwind CSS สไตล์มินิมอล Cloudflare คลีน สะอาด ใช้งานง่าย รองรับการแสดงผลทุกหน้าจอ (Fully Responsive)

---

## ข้อมูลการส่งแบบทดสอบและการเข้าใช้งาน (Submission & Live Testing)

* **URL สำหรับทดสอบระบบออนไลน์**: [https://synerry-shortener.eastasia.cloudapp.azure.com](https://synerry-shortener.eastasia.cloudapp.azure.com)
* **ลิงก์ Repositories ของระบบทั้งหมด (Microservices Architecture)**:
  * **Frontend Repository**: [https://github.com/sangketkit01/synerry-shortener-frontend](https://github.com/sangketkit01/synerry-shortener-frontend)
  * **Core Backend Repository**: [https://github.com/sangketkit01/synerry-shortener-backend](https://github.com/sangketkit01/synerry-shortener-backend)
  * **Analytics Engine Repository**: [https://github.com/sangketkit01/synerry-shortener-analytic](https://github.com/sangketkit01/synerry-shortener-analytic)

### ข้อมูลบัญชีผู้ใช้สำหรับทดสอบ (Test Credentials)

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน (Password) | สิทธิ์การเข้าถึง |
|---|---|---|---|
| **System Administrator** | `admin@synerry.com` | `Admin@123456` | บริหารจัดการระบบ, ตรวจสอบผู้ใช้, ระงับ/แบนลิงก์, ระงับบัญชีผู้ใช้ และสั่งรัน ETL Pipeline |
| **Standard User** | `demo@synerry.com` | `Demo@123456` | ย่อลิงก์, กำหนด Custom Slug, ตั้งวันหมดอายุ, จัดหมวดหมู่, ดูสถิติกราฟ และ Export CSV |
| **Guest Mode** | *(ไม่ต้องล็อกอิน)* | *(ไม่ต้องใช้รหัสผ่าน)* | ย่อลิงก์และสร้าง QR Code ได้ทันทีจากหน้าแรก พร้อม Auto-sync เมื่อล็อกอิน |

---

## ตารางสรุปการตอบโจทย์ตามเกณฑ์การตัดสิน (Exam Criteria Compliance)

| ข้อที่ | เกณฑ์การพิจารณาตามโจทย์ | ผลลัพธ์ในระบบ | ฟังก์ชันและการทำงานที่พัฒนา |
|:---:|---|:---:|---|
| **1** | **Data Flow Diagram (DFD Level 0)** | **ผ่านสมบูรณ์** | ออกแบบ DFD Level 0 (Context Diagram) ครอบคลุมการทำงานทั้ง Guest, User, Admin, Visitor และ Data Store ชัดเจน |
| **2** | **Entity-Relationship Diagram (ERD)** | **ผ่านสมบูรณ์** | ออกแบบ ER Diagram แสดงความสัมพันธ์ตารางอย่างครบถ้วน โดยแยกขาดระหว่าง Core OLTP และ Analytics OLAP Star Schema |
| **3** | **สาธิตการสร้าง Short URL ได้** | **ผ่านสมบูรณ์** | กรอก Long URL และสร้าง Short URL ได้จริง รองรับ Base62 Slug และ Custom Alias และคลิกเปิดไปยัง URL ต้นฉบับด้วย HTTP 302 Redirection ในเวลา < 15ms |
| **4** | **สาธิตการสร้าง QR Code ของ Short URL ได้** | **ผ่านสมบูรณ์** | สร้าง QR Code แบบ Real-time Vector สามารถสแกนด้วยกล้องมือถือเพื่อวิ่งไปยัง URL ปลายทางได้จริง พร้อมปรับสีพื้นหน้า/พื้นหลัง และดาวน์โหลดเป็น PNG หรือ SVG |
| **5** | **สาธิตการเก็บประวัติและแสดงสถิติการคลิก** | **ผ่านสมบูรณ์** | มีหน้า Dashboard แสดงรายการประวัติลิงก์ และหน้า Analytics แสดงสถิติการคลิก, กราฟแนวโน้ม 7 วัน, แยกประเภทอุปกรณ์, เว็บบราวเซอร์, ระบบปฏิบัติการ และประเทศ |
| **6** | **ฟังก์ชันเพิ่มเติม / Microservices / Architecture** | **พิจารณาเป็นพิเศษ** | สถาปัตยกรรม Microservices 3 ชั้น, แยกฐานข้อมูล Core OLTP และ Analytics OLAP, ระบบ Data Pipeline (ETL) ป้องกันคอขวด, และระบบรักษาความปลอดภัยบัญชี |

---

## แผนภาพกระแสข้อมูล: Data Flow Diagram (DFD Level 0)

```mermaid
flowchart TD
    Guest["ผู้ใช้งานทั่วไป (Guest)"]
    Member["สมาชิกในระบบ (Member)"]
    Admin["ผู้ดูแลระบบ (Admin)"]
    Visitor["ผู้คลิกเปิดลิงก์ย่อ (Visitor)"]
    TargetServer["เว็บเซิร์ฟเวอร์ปลายทาง (Target Server)"]

    subgraph SynerryPlatform ["ระบบย่อลิงก์ Synerry Short URL & Analytics Platform"]
        SystemProcess["0.0\nกระบวนการหลักของระบบ\n- จัดการลิงก์ย่อและ QR Code\n- ส่งต่อผู้ใช้ (302 Redirection)\n- บันทึกและวิเคราะห์สถิติ (ETL)\n- บริหารจัดการความปลอดภัย"]
    end

    Guest -->|"1. กรอก URL ต้นฉบับที่ต้องการย่อ"| SystemProcess
    SystemProcess -->|"2. ส่งคืน Short URL และภาพ Vector QR Code"| Guest

    Member -->|"3. เข้าสู่ระบบ, กำหนด Custom Slug, ตั้งวันหมดอายุ,\nจัดหมวดหมู่ และปรับแต่งสี QR Code"| SystemProcess
    SystemProcess -->|"4. รายการประวัติลิงก์, ข้อมูล QR Code และกราฟสถิติการคลิก"| Member

    Visitor -->|"5. ร้องขอเปิดลิงก์ย่อ (/s/:shortCode)\nพร้อมแนบข้อมูล User-Agent, Referrer และ IP"| SystemProcess
    SystemProcess -->|"6. ส่งรหัส HTTP 302 Redirect ไปยังปลายทาง\n(หรือหน้าแจ้งเตือนกรณีลิงก์ถูกแบน/หมดอายุ)"| Visitor
    Visitor -->|"7. บราวเซอร์เปิดหน้าเว็บไซต์ปลายทาง"| TargetServer

    Admin -->|"8. คำสั่งตรวจสอบระบบ, ระงับ/แบนลิงก์, แบนผู้ใช้\nและสั่งรัน Data Pipeline"| SystemProcess
    SystemProcess -->|"9. ข้อมูลสถิติรวมของระบบ, ประวัติการระงับลิงก์\nและสถานะการทำงานของ Data Pipeline"| Admin
```

---

## แผนผังความสัมพันธ์ข้อมูล: Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ Session : "owns"
    User ||--o{ Group : "creates"
    User ||--o{ Url : "owns"
    Group ||--o{ Url : "categorizes"
    Url ||--o{ RawClick : "receives"

    User {
        uuid id PK
        string email UK
        string passwordHash
        string role
        boolean isBanned
        string banReason
    }
    Session {
        uuid id PK
        string tokenHash UK
        uuid userId FK
        datetime expiresAt
        boolean isRevoked
    }
    Group {
        uuid id PK
        string name
        string color
        uuid userId FK
    }
    Url {
        uuid id PK
        string originalUrl
        string shortCode UK
        string customAlias UK
        string title
        boolean isFavorite
        boolean isActive
        boolean isBanned
        datetime expiresAt
        integer clickCount
        uuid userId FK
        uuid groupId FK
    }
    RawClick {
        uuid id PK
        uuid urlId FK
        string ipAddress
        string userAgent
        string referrer
        boolean isProcessed
        datetime clickedAt
    }
```

---

## คู่มือการติดตั้งและเริ่มใช้งานในเครื่อง (Local Installation)

### วิธีที่ 1: รันผ่าน Docker Compose
```bash
cd ..
docker compose up -d
```

### วิธีที่ 2: รันเฉพาะ Frontend Next.js
```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. ตั้งค่าไฟล์ Environment (.env.local)
cp .env.example .env.local

# 3. เริ่มรันเซิร์ฟเวอร์โหมดพัฒนา
npm run dev
# เปิดใช้งานที่ http://localhost:3000
```
