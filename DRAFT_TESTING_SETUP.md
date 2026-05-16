# 🧪 DRAFT Testing Portal Setup

**Purpose:** Isolated testing environment for DRAFT functionality  
**Port:** 3002 (separate from main portal at 3001)  
**Status:** Setting up end-to-end testing

---

## 🎯 Testing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DRAFT TESTING FLOW                        │
└─────────────────────────────────────────────────────────────┘

1️⃣ DRAFT Testing Portal (Port 3002)
   ├── Rule Customization UI
   ├── Document Validation UI
   ├── Validation History
   └── Test Data Seeding
   
2️⃣ Tenant Application (Port 8000)
   ├── /api/v1/draft/rules
   ├── /api/v1/draft/validate
   ├── /api/v1/draft/history
   └── Proxy to DRAFT Service
   
3️⃣ DRAFT Service (Port 8003)
   ├── Validation Engine
   ├── Rule Management
   ├── Template System
   └── Supabase Database
```

---

## 🚀 Quick Start

### **1. Start DRAFT Service**
```bash
cd C:\Users\yasha\OneDrive\Documents\TrueVow\Cursor\2025-TrueVow-Draft-Service
python -m uvicorn app.main:app --reload --port 8003
```

### **2. Start Tenant Application**
```bash
cd C:\Users\yasha\OneDrive\Documents\TrueVow\Cursor\2025-TrueVow-Tenant-Application
python -m uvicorn app.main:app --reload --port 8000
```

### **3. Start DRAFT Testing Portal**
```bash
cd C:\Users\yasha\OneDrive\Documents\TrueVow\Cursor\Truevow-Customer-Portal
npm run dev:draft
# Opens at http://localhost:3002
```

---

## 📝 Test Scenarios

### **Scenario 1: View Available Rules**
1. Navigate to http://localhost:3002/draft/rules
2. Should see list of validation rules from DRAFT Service
3. Filter by practice area, document type

### **Scenario 2: Validate Document**
1. Navigate to http://localhost:3002/draft/validate
2. Upload or paste document content
3. Select validation rules
4. Click "Validate"
5. See validation results

### **Scenario 3: View History**
1. Navigate to http://localhost:3002/draft/history
2. See past validation attempts
3. Filter by date, status
4. View detailed results

---

## 🔧 Configuration

### **Environment Variables**
```bash
# .env.local
NEXT_PUBLIC_TENANT_APP_API_URL=http://localhost:8000
NEXT_PUBLIC_DRAFT_SERVICE_URL=http://localhost:8003
NEXT_PUBLIC_TENANT_APP_API_KEY=your_api_key_here
```

---

**Status:** 🔄 In Progress  
**Next:** Build DRAFT endpoints in Tenant Application


