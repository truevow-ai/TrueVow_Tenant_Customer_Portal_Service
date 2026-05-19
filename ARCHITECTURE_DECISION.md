# Architecture Decision: Customer Portal

**Date:** December 25, 2025  
**Status:** ✅ **APPROVED AND IMPLEMENTED**

---

## 🎯 **Decision**

**Create a separate Customer Portal repository** (`Truevow-Customer-Portal`) for law firm users, distinct from the SaaS Admin portal.

---

## 📋 **Context**

TrueVow has three distinct user groups:

1. **TrueVow Staff** (Internal) - Need to manage all tenants, billing, system configuration
2. **Law Firm Users** (External Customers) - Need to use TrueVow services for their firm
3. **API Consumers** (Backend) - Multi-tenant backend services

**Question:** Should law firm users access services through:
- **Option A:** Separate Customer Portal repository (CHOSEN ✅)
- **Option B:** Embedded in SaaS Admin repository
- **Option C:** Direct API access only (no UI)

---

## ✅ **Why We Chose Option A: Separate Repository**

### **1. Clear Separation of Concerns**
```
SaaS Admin (Internal)          Customer Portal (External)
├── Manage ALL tenants         ├── View THEIR data only
├── System configuration       ├── Use services
├── Cross-tenant analytics     ├── Firm-specific settings
└── Billing management         └── Team management
```

### **2. Security Isolation**
- **SaaS Admin:** Full system access, internal authentication
- **Customer Portal:** Tenant-scoped access, external authentication (Clerk)
- **Benefit:** Prevents accidental cross-tenant data exposure

### **3. Independent Deployment**
- Update customer-facing UI without affecting internal tools
- Scale independently based on customer usage
- Different CDN/hosting strategies (customer portal = high traffic)

### **4. Team Structure**
- **Customer Experience Team** → Customer Portal
- **Internal Tools Team** → SaaS Admin
- **Backend Team** → Tenant Application
- **Benefit:** Teams can work independently

### **5. Technology Flexibility**
- Customer Portal: Next.js 14, Clerk, Tailwind CSS
- SaaS Admin: Next.js 14, Internal SSO, Different UI library
- **Benefit:** Choose best tools for each audience

---

## ❌ **Why We Rejected Option B: Embedded in SaaS Admin**

### **Problems:**
1. ❌ **Mixed Audiences:** Internal staff and external customers in same codebase
2. ❌ **Complex Permissions:** Hard to isolate staff vs customer access
3. ❌ **Deployment Coupling:** Can't update one without affecting the other
4. ❌ **Security Risk:** Harder to prevent cross-tenant data leaks
5. ❌ **Confusing UX:** Staff UI patterns don't match customer expectations

---

## ❌ **Why We Rejected Option C: API Only**

### **Problems:**
1. ❌ **Poor UX:** Law firms need a dashboard, not just APIs
2. ❌ **High Barrier:** Requires technical integration for basic tasks
3. ❌ **Support Burden:** More support tickets for "how do I...?"
4. ❌ **Competitive Disadvantage:** Competitors have dashboards

---

## 🏗️ **Final Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRUEVOW ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  SaaS Admin Portal   │  ← Internal TrueVow staff
│  (Next.js)           │
│                      │
│  - Manage tenants    │
│  - System config     │
│  - Cross-tenant data │
└──────────┬───────────┘
           │
           │ API Calls
           │
           ↓
┌──────────────────────┐
│  Tenant Application  │  ← Multi-tenant backend (FastAPI)
│  (Python/FastAPI)    │
│                      │
│  - INTAKE API        │
│  - DRAFT API         │
│  - BILLING API       │
│  - Database          │
└──────────┬───────────┘
           │
           │ API Calls
           │
           ↑
┌──────────────────────┐
│  Customer Portal     │  ← Law firm users (attorneys, paralegals)
│  (Next.js)           │
│                      │
│  - View their leads  │
│  - Use DRAFT         │
│  - View their billing│
│  - Firm settings     │
└──────────────────────┘
```

---

## 📊 **Comparison Table**

| Aspect | SaaS Admin | Customer Portal | Tenant App |
|--------|------------|-----------------|------------|
| **Users** | TrueVow staff | Law firm users | N/A (API) |
| **Auth** | Internal SSO | Clerk | API keys |
| **Scope** | All tenants | Single tenant | Multi-tenant |
| **Tech** | Next.js | Next.js | FastAPI |
| **Data Access** | Cross-tenant | Tenant-scoped | All data |
| **Deployment** | Internal | Public | Internal |
| **Purpose** | Manage system | Use services | Provide APIs |

---

## ✅ **Benefits of This Architecture**

### **For TrueVow:**
- ✅ Clear separation between internal and external tools
- ✅ Independent deployment and scaling
- ✅ Better security isolation
- ✅ Team independence

### **For Law Firms:**
- ✅ Clean, focused UI for their needs
- ✅ No confusion with internal admin features
- ✅ Better performance (optimized for customer use)
- ✅ Professional customer experience

### **For Development:**
- ✅ Easier to maintain (smaller codebases)
- ✅ Faster development (no conflicts)
- ✅ Better testing (isolated concerns)
- ✅ Technology flexibility

---

## 🚀 **Implementation Status**

### **✅ Completed:**
- ✅ Customer Portal repository created
- ✅ Next.js 14 setup with App Router
- ✅ Clerk authentication configured
- ✅ Dashboard layout with sidebar
- ✅ INTAKE module (stats + leads list)
- ✅ API client for Tenant Application
- ✅ TypeScript + Tailwind CSS setup
- ✅ Documentation (README, this file)

### **🔄 Next Steps:**
- 🔄 Implement DRAFT module
- 🔄 Implement BILLING module
- 🔄 Add Settings page
- 🔄 Deploy to production

---

## 📝 **Lessons Learned**

### **What Worked Well:**
- ✅ Clear architectural boundaries from the start
- ✅ API-first design made integration easy
- ✅ Separate repos avoided merge conflicts

### **What to Watch:**
- ⚠️ Keep API client in sync with backend changes
- ⚠️ Maintain consistent UX across modules
- ⚠️ Document tenant ID mapping clearly

---

## 🔄 **Future Considerations**

### **Potential Enhancements:**
1. **Mobile App:** Could reuse same API client
2. **White-Label:** Customer Portal could be customized per tenant
3. **API Access:** Some customers may want direct API access too
4. **Embedded Widgets:** Customer Portal components in law firm websites

### **Scalability:**
- Customer Portal can scale independently
- Can add CDN for static assets
- Can implement edge caching for API responses

---

## 📞 **References**

- **Customer Portal Repo:** `Truevow-Customer-Portal/`
- **SaaS Admin Repo:** `2025-TrueVow-SaaS-Administration/`
- **Tenant Application Repo:** `2025-TrueVow-Tenant-Application/`
- **DRAFT Integration Guide:** `docs/SAAS_ADMIN_DRAFT_INTEGRATION_GUIDE.md`

---

## 🔄 **Phase 2 Updates (May 2026)**

### **Phase 2.1 — Confidence Score UI**
- Added `ConfidenceScoreData` and `ConfidenceFactor` types to `lib/api/settle-client.ts`
- Updated `EstimateResponse` with `confidence_score` field
- Confidence score displays on analysis and query pages with:
  - Overall score badge (green/amber/red)
  - Factor breakdown with progress bars
  - Warnings section for data quality issues

### **Phase 2.2 — Advanced Filter Controls**
- Added 9 new optional fields to `EstimateRequest`:
  - `outcome_type`, `date_range_from`, `date_range_to`
  - `medical_bills_min`, `medical_bills_max`
  - `exclude_outliers`, `min_reputation_score`
  - `comparative_negligence_min`, `comparative_negligence_max`
- Collapsible advanced filters section on query page
- Clear button to reset all advanced filters

### **Phase 2.3 — Carrier Patterns Analytics**
- New page at `/dashboard/settle/carrier-patterns`
- API proxy route `/api/settle/carrier-patterns`
- `CarrierPattern` and `CarrierPatternsResponse` types
- `getCarrierPatterns()` method in `settleClient`
- Sidebar navigation link added

### **Infrastructure Updates**
- `opencode.json` configured with 3-mode agent workflow (architect, coder, qa)
- Agent definitions in `.opencode/agents/`
- Agent rules in `.opencode/rules/agent-rules.md`
- Phase 2 skill documentation in `.opencode/skills/`

---

**Decision Made By:** AI Agent + User Collaboration  
**Approved By:** User  
**Status:** ✅ Implemented  
**Review Date:** March 2026

---

*This architecture decision follows enterprise SaaS best practices and provides a solid foundation for TrueVow's growth.*


