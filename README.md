# TrueVow Customer Portal

**Customer-facing dashboard for law firms using TrueVow services**

---

## 🎯 **Purpose**

The TrueVow Customer Portal is the **law firm user interface** for accessing TrueVow services:
- **INTAKE:** View leads, manage intake sessions
- **DRAFT:** Validate documents, manage validation rules (coming soon)
- **BILLING:** View usage and billing information (coming soon)
- **SETTINGS:** Manage firm profile and integrations (coming soon)

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    TRUEVOW ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────┘

1️⃣ SaaS Admin (Internal Staff)
   - Location: 2025-TrueVow-SaaS-Administration/
   - Users: TrueVow staff
   - Purpose: Manage all tenants, billing, system

2️⃣ Customer Portal (Law Firm Users) ⭐ THIS REPO
   - Location: Truevow-Customer-Portal/
   - Users: Law firm staff (attorneys, paralegals)
   - Purpose: Use TrueVow services

3️⃣ Tenant Application (Backend API)
   - Location: 2025-TrueVow-Tenant-Application/
   - Tech: Python + FastAPI
   - Purpose: Multi-tenant backend services
```

---

## 🚀 **Quick Start**

### **Prerequisites**

- Node.js 18+ and npm 9+
- Tenant Application backend running at `http://localhost:8000`
- Clerk account for authentication

### **Installation**

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your values
# - NEXT_PUBLIC_TENANT_APP_API_URL (backend URL)
# - NEXT_PUBLIC_TENANT_APP_API_KEY (API key from backend)
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (Clerk public key)
# - CLERK_SECRET_KEY (Clerk secret key)

# Run development server
npm run dev
```

The portal will be available at `http://localhost:3001`

---

## 📁 **Project Structure**

```
Truevow-Customer-Portal/
├── app/
│   ├── (auth)/                    # Authentication pages
│   │   ├── sign-in/              # Sign in page
│   │   └── sign-up/              # Sign up page
│   ├── (dashboard)/              # Protected dashboard pages
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   └── dashboard/
│   │       ├── page.tsx          # Dashboard home
│   │       ├── intake/           # INTAKE module
│   │       ├── draft/            # DRAFT module (coming soon)
│   │       ├── billing/          # BILLING module (coming soon)
│   │       └── settings/         # Settings (coming soon)
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
├── lib/
│   └── api/
│       └── tenant-app-client.ts  # API client for backend
├── components/                    # Reusable components (future)
├── middleware.ts                  # Clerk authentication middleware
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## 🔌 **API Integration**

### **Tenant Application Backend**

The Customer Portal connects to the Tenant Application backend (FastAPI) for all data:

```typescript
// lib/api/tenant-app-client.ts
import { tenantAppClient } from '@/lib/api/tenant-app-client';

// Get intake stats
const stats = await tenantAppClient.getIntakeStats(tenantId);

// Get leads
const leads = await tenantAppClient.getLeads(tenantId, {
  status: 'all',
  limit: 50,
  offset: 0,
});

// Create lead
const newLead = await tenantAppClient.createLead({
  tenant_id: tenantId,
  first_name: 'John',
  last_name: 'Doe',
  phone: '555-1234',
  email: 'john@example.com',
});
```

### **Available Endpoints**

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/v1/intake/stats` | GET | Get intake statistics | ✅ Implemented |
| `/api/v1/intake/leads` | GET | Get leads list | ✅ Implemented |
| `/api/v1/intake/leads` | POST | Create new lead | ✅ Implemented |
| `/api/v1/draft/*` | * | DRAFT endpoints | 🔄 Coming Soon |
| `/api/v1/billing/*` | * | Billing endpoints | 🔄 Coming Soon |

---

## 🔐 **Authentication**

### **Clerk Setup**

1. Create a Clerk account at https://clerk.com
2. Create a new application
3. Copy your publishable and secret keys to `.env.local`
4. Configure sign-in/sign-up URLs in Clerk dashboard

### **Tenant ID Mapping**

The Customer Portal needs to map Clerk users to tenant IDs. You can do this by:

**Option 1: Clerk Public Metadata (Recommended)**
```typescript
// Set tenant_id in Clerk user metadata
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    tenantId: 'uuid-here',
  },
});

// Access in pages
const { sessionClaims } = auth();
const tenantId = sessionClaims?.tenantId;
```

**Option 2: Database Lookup**
```typescript
// Store user_id -> tenant_id mapping in your database
const tenant = await db.tenants.findOne({ clerk_user_id: userId });
```

---

## 🎨 **UI Components**

### **Tech Stack**

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Auth:** Clerk
- **API Client:** Axios
- **Date Formatting:** date-fns

### **Adding New Pages**

```typescript
// app/(dashboard)/dashboard/new-page/page.tsx
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default async function NewPage() {
  const { userId, sessionClaims } = auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const tenantId = sessionClaims?.tenantId as string;

  return (
    <div>
      <h1 className="text-3xl font-bold">New Page</h1>
      {/* Your content */}
    </div>
  );
}
```

---

## 📊 **Current Status**

### **✅ Implemented**

- ✅ Next.js 14 setup with App Router
- ✅ Clerk authentication
- ✅ Dashboard layout with sidebar
- ✅ INTAKE stats dashboard
- ✅ INTAKE leads list
- ✅ API client for Tenant Application
- ✅ TypeScript configuration
- ✅ Tailwind CSS styling

### **🔄 Coming Soon**

- 🔄 DRAFT validation management
- 🔄 DRAFT validation history
- 🔄 Billing & usage dashboard
- 🔄 Settings & firm profile
- 🔄 Team member management
- 🔄 Integrations management

---

## 🧪 **Testing**

### **Prerequisites**

1. **Start Tenant Application backend:**
   ```bash
   cd ../2025-TrueVow-Tenant-Application
   python -m uvicorn app.main:app --reload --port 8000
   ```

2. **Seed test data:**
   ```bash
   cd ../2025-TrueVow-Tenant-Application
   python scripts/seed_intake_test_data.py
   ```

3. **Start Customer Portal:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   - Navigate to `http://localhost:3001`
   - Sign in with Clerk
   - View dashboard and intake leads

---

## 🚢 **Deployment**

### **Vercel (Recommended)**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_TENANT_APP_API_URL
# - NEXT_PUBLIC_TENANT_APP_API_KEY
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - CLERK_SECRET_KEY
```

### **Docker**

```dockerfile
# Dockerfile (create this)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

---

## 📝 **Development Guidelines**

### **Code Style**

- Use TypeScript for all files
- Follow Next.js App Router conventions
- Use Tailwind CSS for styling
- Keep components small and focused
- Use server components by default, client components only when needed

### **API Calls**

- Always use the `tenantAppClient` from `lib/api/tenant-app-client.ts`
- Handle errors gracefully with try/catch
- Show user-friendly error messages
- Log errors for debugging

### **Security**

- Never expose API keys in client-side code
- Always validate tenant_id from session claims
- Use Clerk middleware for authentication
- Sanitize user inputs

---

## 🤝 **Contributing**

This is an internal TrueVow project. For questions or issues:

1. Check the Tenant Application backend is running
2. Verify environment variables are set correctly
3. Check Clerk authentication is configured
4. Review API client logs in browser console

---

## 📞 **Support**

### **Backend API Issues**
- Repository: `2025-TrueVow-Tenant-Application`
- Check if backend is running: `http://localhost:8000/health`
- Review backend logs

### **Authentication Issues**
- Clerk Dashboard: https://dashboard.clerk.com
- Verify API keys in `.env.local`
- Check middleware configuration

### **UI Issues**
- Check browser console for errors
- Verify Tailwind CSS is compiling
- Review Next.js build logs

---

**Last Updated:** December 25, 2025  
**Status:** ✅ Initial Setup Complete  
**Next Steps:** Implement DRAFT and BILLING modules

---

*Built with ❤️ for TrueVow Law Firms*


