# 🎯 GeoEngage Admin Web Frontend - Implementation Plan

**Date:** March 3, 2026  
**Version:** 1.0

---

## 📋 **OVERVIEW**

This document outlines the step-by-step implementation plan for the GeoEngage Admin Web Frontend, organized by commits for clean version control and progressive development.

**Scope:**
- Web-based admin panel for campaign management
- Analytics dashboard for zone performance tracking
- Admin authentication and profile management
- Integration with existing backend APIs

**Technology Stack:**
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **UI Library:** Material-UI (MUI) v5
- **State Management:** React Context API + React Query
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Authentication:** Firebase Auth (Google Sign-In)
- **Charts:** Recharts
- **Form Management:** React Hook Form + Zod validation
- **Styling:** MUI styled-components + Emotion

---

## 🔑 **KEY API SPECIFICATIONS**

**Important Data Types:**
- `zone_id`: UUID string (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
- `campaign_id`: Integer (e.g., `1`, `2`, `3`)
- `floor_id`: Integer (floor number)

**Key API Behaviors:**
- Campaign creation only requires `zone_id` (UUID) and `message`
- No `campaign_name` field in API - use zone name for display in UI
- Only one active campaign per zone at a time
- Activating a campaign auto-deactivates other campaigns for that zone
- All admin endpoints require Firebase authentication with admin role

---

## 🗂️ **PROJECT STRUCTURE**

```
geoengage-admin-web/
├── public/
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── assets/
│   │   ├── logo.svg
│   │   └── images/
│   ├── components/
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── campaigns/
│   │   │   ├── CampaignForm.tsx
│   │   │   ├── CampaignList.tsx
│   │   │   ├── CampaignCard.tsx
│   │   │   └── CampaignActions.tsx
│   │   ├── analytics/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── ZonePerformanceTable.tsx
│   │   │   └── PerformanceChart.tsx
│   │   └── profile/
│   │       ├── ProfileInfo.tsx
│   │       └── PasswordChange.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── CampaignsPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── ProfilePage.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── campaignService.ts
│   │   └── analyticsService.ts
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCampaigns.ts
│   │   └── useAnalytics.ts
│   ├── types/
│   │   ├── campaign.ts
│   │   ├── zone.ts
│   │   ├── analytics.ts
│   │   └── user.ts
│   ├── utils/
│   │   ├── formatDate.ts
│   │   ├── calculateCTR.ts
│   │   └── validators.ts
│   ├── theme/
│   │   └── theme.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **Admin User Management**
- Admins authenticate via Google Sign-In (Firebase Auth) - same as mobile app
- Backend validates Firebase ID token
- Only users with `role: 'admin'` can access admin endpoints
- Admin accounts must be pre-configured in database with admin role

### **Login Flow**
```
User opens admin panel
  ↓
Login page (Google Sign-In button)
  ↓
Firebase Google Sign-In popup
  ↓
Get Firebase ID token
  ↓
Call backend to verify user and check admin role
  ↓
If role !== 'admin' → Show error "Unauthorized: Admin access only" + logout
  ↓
Store user in context
  ↓
Navigate to Campaigns page
```

**Note:** Uses same Google Sign-In flow as mobile app, but only allows users with admin role.

---

## 📊 **BACKEND API ENDPOINTS FOR ADMIN**

### **Available API Endpoints (From Your Backend)**

#### **1. POST `/api/v1/campaigns`**
**Description:** Create a new campaign for a zone (zone_id = UUID string)  
**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "zone_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Welcome to the mall! Show this for 10% off parking."
}
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": 3,
    "zone_id": "550e8400-e29b-41d4-a716-446655440000",
    "zone_name": "Main Entrance",
    "message": "Welcome to the mall! Show this for 10% off parking.",
    "active": false,
    "created_at": "2026-03-03T12:00:00Z"
  }
}
```

**Notes:**
- `zone_id` is a UUID string (not integer)
- Campaign is created as inactive by default
- No `campaign_name` field - use zone name for display

---

#### **2. GET `/api/v1/campaigns`**
**Description:** List campaigns with optional filter by zone_id (UUID string)  
**Authentication:** Required (Admin only)

**Query Parameters:**
- `zone_id` (optional): Filter campaigns by zone UUID

**Response:**
```json
[
  {
    "id": 1,
    "zone_id": "550e8400-e29b-41d4-a716-446655440000",
    "zone_name": "Main Entrance",
    "message": "Welcome to the mall! Show this for 10% off parking.",
    "active": true,
    "created_at": "2026-03-01T10:00:00Z"
  },
  {
    "id": 2,
    "zone_id": "660e8400-e29b-41d4-a716-446655440001",
    "zone_name": "Food Court",
    "message": "Hungry? Get a free drink with any combo meal.",
    "active": false,
    "created_at": "2026-03-02T14:30:00Z"
  }
]
```

**Notes:**
- `id` is integer (campaign_id)
- `zone_id` is UUID string
- Returns all campaigns or filtered by zone_id

---

#### **3. PUT `/api/v1/campaigns/{campaign_id}`**
**Description:** Activate/deactivate campaign. Only one active campaign per zone. Activating deactivates others.  
**Authentication:** Required (Admin only)

**Path Parameters:**
- `campaign_id` (required, integer): Campaign ID

**Request Body:**
```json
{
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": 1,
    "active": true,
    "updated_at": "2026-03-03T12:00:00Z"
  }
}
```

**Backend Logic:**
- Only one active campaign per zone at a time
- Activating a campaign automatically deactivates other campaigns for the same zone
- `campaign_id` is an integer in the URL path

---

#### **4. GET `/api/v1/analytics`**
**Description:** Dashboard analytics - Zone entries, notifications sent, clicks, CTR, top zones by CTR  
**Authentication:** Required (Admin only)

**Parameters:** None

**Response:**
```json
{
  "summary": {
    "total_entries": 4250,
    "notifications_sent": 3800,
    "clicks": 850,
    "avg_ctr": 0.223
  },
  "zones": [
    {
      "zone_id": "550e8400-e29b-41d4-a716-446655440000",
      "zone_name": "Main Entrance",
      "entries": 2100,
      "sent": 2000,
      "clicks": 500,
      "ctr": 0.25
    },
    {
      "zone_id": "660e8400-e29b-41d4-a716-446655440001",
      "zone_name": "Food Court",
      "entries": 1100,
      "sent": 1000,
      "clicks": 200,
      "ctr": 0.20
    },
    {
      "zone_id": "770e8400-e29b-41d4-a716-446655440002",
      "zone_name": "Electronics Wing",
      "entries": 600,
      "sent": 400,
      "clicks": 100,
      "ctr": 0.25
    },
    {
      "zone_id": "880e8400-e29b-41d4-a716-446655440003",
      "zone_name": "North Exit",
      "entries": 450,
      "sent": 400,
      "clicks": 50,
      "ctr": 0.125
    }
  ]
}
```

**Notes:**
- Returns summary metrics and per-zone breakdown
- CTR is decimal (0.25 = 25%)
- `zone_id` is UUID string

---

#### **5. GET `/api/v1/zones`** (Optional)
**Description:** List zones with optional floor_id (floor number) filter  
**Authentication:** Required (Admin only)

**Query Parameters:**
- `floor_id` (optional, integer): Filter by floor number

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Main Entrance",
    "floor_id": 1,
    "floor_name": "Ground Floor"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Food Court",
    "floor_id": 1,
    "floor_name": "Ground Floor"
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Electronics Wing",
    "floor_id": 1,
    "floor_name": "Ground Floor"
  },
  {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "name": "North Exit",
    "floor_id": 1,
    "floor_name": "Ground Floor"
  }
]
```

**Notes:**
- Zone `id` is UUID string (this will be used as `zone_id` when creating campaigns)
- `floor_id` is integer (floor number)
- This endpoint is needed for populating the "Target Zone" dropdown

---

#### **6. GET `/api/v1/floors`**
**Description:** List all floors in venue (floor_id = floor number, floor_name)  
**Authentication:** Required (Admin only)

**Parameters:** None

**Response:**
```json
[
  {
    "id": 1,
    "name": "Ground Floor",
    "floor_number": 0
  },
  {
    "id": 2,
    "name": "First Floor",
    "floor_number": 1
  }
]
```

**Notes:**
- Returns floor information
- `floor_number` corresponds to `floor_id` in zones
- May be used for future floor filtering

---

### **Additional Endpoints (If Needed)**

#### **7. DELETE `/api/v1/campaigns/{campaign_id}`** (To Be Confirmed)
Delete campaign permanently

**Path Parameters:**
- `campaign_id` (required, integer): Campaign ID

**Response:**
```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

**Note:** Check with backend team if this endpoint exists or needs implementation

---

## 🎨 **UI PAGES & COMPONENTS**

### **1. Login Page**
- Centered card with lock icon at top
- "Admin Login" heading
- Subtitle: "Enter any email/password to view the UI" (for demo purposes, but actual is Google Sign-In)
- Blue "Sign in" button
- **Actual Implementation:** Google Sign-In button that triggers Firebase Google authentication
- Clean, minimal design (as per UI image)
- Show error if user is not admin after Google Sign-In

### **2. Campaigns Page** (Main page after login)
- **Top Section:** Create New Campaign form
  - Campaign Name input (optional - for display purposes in UI only, not sent to API)
  - Target Zone dropdown (fetch from GET `/api/v1/zones`, display zone name)
  - Notification Message textarea
  - "Create Campaign" button
- **Bottom Section:** Active & Past Campaigns table
  - Columns: Status, Campaign (zone name), Zone, Message, Actions
  - Actions: Activate/Deactivate toggle, Delete button (if available)
  - Status badges (green for active, gray for inactive)
  
**Notes:**
- Zone dropdown populated from GET `/api/v1/zones` endpoint
- Only zone_id (UUID) and message are sent to backend
- Campaign name can be derived from zone name for display

### **3. Analytics Page**
- **Top Section:** Metric cards (4 cards in a row)
  - Total Entries
  - Notifications Sent
  - Click Count
  - Avg. CTR
- **Bottom Section:** Performance by Zone table
  - Columns: Zone, Entries, Sent, Clicks, CTR
  - Sortable columns
  - CTR shown as percentage with color coding

### **4. Profile Page**
- Admin information display
  - Avatar (initials-based)
  - Name
  - Email
  - Role badge
  - Account created date
- Edit profile section
  - Update name
  - Change password
- Logout button

---

## 📝 **COMMIT-BY-COMMIT IMPLEMENTATION PLAN**

### **Phase 1: Project Setup & Configuration**

#### **Commit 1: Initialize React + Vite + TypeScript project**
**Tasks:**
- Create new Vite project with React + TypeScript template
- Install core dependencies
- Set up project structure (folders)
- Configure TypeScript (tsconfig.json)
- Create .env.example with environment variables
- Update README with setup instructions

**Command:**
```bash
npm create vite@latest geoengage-admin-web -- --template react-ts
```

**Dependencies:**
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "axios": "^1.6.0",
  "firebase": "^10.7.0"
}
```

**Files Created:**
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `.env.example`
- `src/main.tsx`
- `src/App.tsx`

---

#### **Commit 2: Install and configure Material-UI theme**
**Tasks:**
- Install MUI packages
- Create custom theme with brand colors
- Set up ThemeProvider in App.tsx
- Configure global styles

**Dependencies:**
```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```

**Files Created:**
- `src/theme/theme.ts`

**Updated:**
- `src/App.tsx` (wrap with ThemeProvider)

**Theme Configuration:**
```typescript
// Blue primary color (from UI images)
// Clean, professional design
```

---

#### **Commit 3: Configure Firebase Authentication**
**Tasks:**
- Configure Firebase (firebaseConfig)
- Create Firebase initialization file
- Set up environment variables

**Files Created:**
- `src/config/firebase.ts`
- `.env` (gitignored)

**Updated:**
- `.env.example`

---

#### **Commit 4: Set up Axios API service with interceptors**
**Tasks:**
- Create Axios instance
- Add request interceptor (attach Firebase token)
- Add response interceptor (handle 401 errors)
- Create base API service

**Files Created:**
- `src/services/api.ts`

---

### **Phase 2: Authentication & Layout**

#### **Commit 5: Create AuthContext and authentication service**
**Tasks:**
- Create AuthContext for global auth state
- Implement login, logout, token refresh logic
- Create useAuth hook
- Handle admin role verification

**Files Created:**
- `src/contexts/AuthContext.tsx`
- `src/services/authService.ts`
- `src/hooks/useAuth.ts`
- `src/types/user.ts`
Google Sign-In authentication**
**Tasks:**
- Create LoginPage component
- Google Sign-In button integration
- Error handling for non-admin users
- Loading state during authentication
- Match UI design from image (lock icon, centered card)

**Files Created:**
- `src/pages/LoginPage.tsx`

**Features:**
- "Continue with Google" button (styled with Google branding)
- After successful Google Sign-In, verify user has admin role
- Show error message: "Access denied. Admin privileges required." if not admin
- Auto-redirect if already logged in
- Logout user if they're not adm
- Form validation (email format, password required)
- Show error messages
- Auto-redirect if already logged in

---

#### **Commit 7: Create protected route wrapper and routing setup**
**Tasks:**
- Set up React Router
- Create ProtectedRoute component
- Configure routes (login, campaigns, analytics, profile)
- Handle unauthorized access redirects

**Files Created:**
- `src/components/common/ProtectedRoute.tsx`

**Updated:**
- `src/App.tsx` (add routing)

**Routes:**
```
/ → redirect to /campaigns (if logged in) or /login
/login → LoginPage
/campaigns → CampaignsPage (protected)
/analytics → AnalyticsPage (protected)
/profile → ProfilePage (protected)
```

---

#### **Commit 8: Build admin layout with sidebar and header**
**Tasks:**
- Create AdminLayout component
- Sidebar with navigation (Campaigns, Analytics)
- Header with logo and logout button
- Responsive drawer for mobile

**Files Created:**
- `src/components/layout/AdminLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Header.tsx`

**Features:**
- Material-UI Drawer for sidebar
- Active route highlighting
- User avatar/name in header
- Logout button

---

### **Phase 3: Campaigns Management**

#### **Commit 9: Create campaign types and API service**
**Tasks:**
- Define TypeScript types for campaigns
- Create campaign service with API methods
- Create zone service for fetching zones

**Files Created:**
- `src/types/campaign.ts`
- `src/types/zone.ts`
- `src/services/campaignService.ts`
- `src/services/zoneService.ts`

**API Methods:**
```typescript
getCampaigns(zone_id?: string)  // Optional UUID filter
createCampaign(data: { zone_id: string; message: string })
updateCampaign(id: number, data: { active: boolean })
deleteCampaign(id: number)  // If endpoint exists
getZones(floor_id?: number)
```

**Type Definitions:**
```typescript
interface Campaign {
  id: number;  // integer
  zone_id: string;  // UUID
  zone_name: string;
  message: string;
  active: boolean;
  created_at: string;
}

interface Zone {
  id: string;  // UUID
  name: string;
  floor_id: number;
  floor_name: string;
}
```

---

#### **Commit 10: Build CampaignsPage with empty state**
**Tasks:**
- Create CampaignsPage component
- Set up layout structure
- Add loading and error states
- Empty state message

**Files Created:**
- `src/pages/CampaignsPage.tsx`

---

#### **Commit 11: Create campaign form component (Create New Campaign)**
**Tasks:**
- Build CampaignForm component
- Campaign name input field (optional, for UI display only)
- Zone dropdown (fetch from GET `/api/v1/zones`, show zone names)
- Message textarea
- Form validation with React Hook Form + Zod
- Submit handler

**Files Created:**
- `src/components/campaigns/CampaignForm.tsx`

**Dependencies:**
```bash
npm install react-hook-form zod @hookform/resolvers
```

**Features:**
- Auto-fetch zones for dropdown (show zone name, store zone UUID)
- Validation:
  - Zone selection required
  - Message required and max length (e.g., 500 chars)
  - Campaign name optional (UI only)
- Loading state during submission
- Success/error notifications
- Sends only `{ zone_id: "uuid-string", message: "..." }` to API

---

#### **Commit 12: Build CampaignList and CampaignCard components**
**Tasks:**
- Create CampaignList component (table)
- Create CampaignCard component (table row)
- Display campaign data
- Status badges (active/inactive)
- Match UI design from image

**Files Created:**
- `src/components/campaigns/CampaignList.t (zone name), Zone, Message, Actions
- Color-coded status badges (green for active, gray for inactive)
- Empty state when no campaigns
- Display zone name instead of campaign name
- Handle UUID zone_id and integer campaign id properly
**Features:**
- MUI Table with columns: Status, Campaign, Zone, Message, Actions
- Color-coded status badges
- Empty state when no campaigns

---

#### **Commit 13: Add campaign actions (activate/deactivate, delete)**
**Tasks:** (sends PUT request with `{ active: true/false }`)
- Delete button with confirmation dialog (if endpoint available)
- Optimistic UI updates

**Files Created:**
- `src/components/campaigns/CampaignActions.tsx`
- `src/components/common/ConfirmDialog.tsx`

**Features:**
- Toggle switch or button for activate/deactivate
- Sends `PUT /api/v1/campaigns/{campaign_id}` with integer campaign ID
- Trash icon for delete (if DELETE endpoint exists)
- Confirmation dialog: "Are you sure you want to delete this campaign?"
- Show loading during API calls
- Show warning: "Activating this campaign will deactivate other campaigns for this zone"
- Confirmation dialog: "Are you sure you want to delete this campaign?"
- Show loading during API calls

---

#### **Commit 14: Integrate React Query for campaign data management**
**Tasks:**
- Install React Query
- Create useCampaigns hook
- Implement queries and mutations
- Add cache invalidation
- Optimistic updates

**Dependencies:**
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

**Files Created:**
- `src/hooks/useCampaigns.ts`

**Updated:**
- `src/App.tsx` (wrap with QueryClientProvider)
- `src/components/campaigns/CampaignForm.tsx`
- `src/components/campaigns/CampaignActions.tsx`

---

### **Phase 4: Analytics Dashboard**

#### **Commit 15: Create analytics types and API service**
**Tasks:**
- Define TypeScript types for analytics
- Create analytics service with API methods

**Files Created:**
- `src/types/analytics.ts`
- `src/services/analyticsService.ts`

---

#### **Commit 16: Build AnalyticsPage with metric cards**
**Tasks:**
- Create AnalyticsPage component
- Build MetricCard component
- Display 4 summary metrics (Total Entries, Notifications Sent, Click Count, Avg. CTR)
- Match UI design from image

**Files Created:**
- `src/pages/AnalyticsPage.tsx`
- `src/components/analytics/MetricCard.tsx`

**Features:**
- Grid layout (4 cards in a row)
- Large numbers with labels
- Icons for each metric
- Loading skeletons

---

#### **Commit 17: Build ZonePerformanceTable component**
**Tasks:**
- Create ZonePerformanceTable component
- Display zone-wise analytics
- Sortable columns
- CTR percentage with color coding
- Match UI design from image

**Files Created:**
- `src/components/analytics/ZonePerformanceTable.tsx`

**Features:**
- MUI Table with columns: Zone, Entries, Sent, Clicks, CTR
- Sortable by each column
- CTR color coding (green for high, red for low)
- Responsive design

---

#### **Commit 18: Add date range filter for analytics**
**Tasks:**
- Add date range picker
- Filter analytics by date range
- Update API calls with date parameters

**Dependencies:**
```bash
npm install @mui/x-date-pickers dayjs
```

**Updated:**
- `src/pages/AnalyticsPage.tsx`
- `src/services/analyticsService.ts`

---

### **Phase 5: Profile Management**

#### **Commit 19: Build ProfilePage with admin information**
**Tasks:**
- Create ProfilePage component
- Display admin info (name, email, role)
- Avatar with initials
- Account creation date
- Match general admin panel design

**Files Created:**
- `src/pages/ProfilePage.tsx`
- `src/components/profile/ProfileInfo.tsx`

**Features:**
- Card layout
- Avatar (auto-generated from initials)
- Role badge
- Formatted dates

---

#### **Commit 20: Add profile edit functionality**
**Tasks:** (display only, linked to Google account)
- Basic profile information display

**Files Created:**
- `src/components/profile/ProfileEditForm.tsx`

**Updated:**
- `src/services/authService.ts` (add updateProfile if needed)

**Features:**
- Display Google account information
- Show email (read-only, from Google account)
- Show name (from Google account)
- Note: Password management done through Google account settings
- Success notifications for any updateange form (current + new + confirm)
- Validation (password strength, match confirmation)
- Success notifications

---

#### **Commit 21: Add logout functionality to profile page**
**Tasks:**
- Add logout button to ProfilePage
- Confirmation dialog
- Clear local state on logout
- Redirect to login

**Updated:**
- `src/pages/ProfilePage.tsx`

---

### **Phase 6: Polish & Refinements**

#### **Commit 22: Add loading states and error handling**
**Tasks:**
- Create LoadingSpinner component
- Add error boundary
- Implement error notifications (toast/snackbar)
- Add loading states to all async operations

**Files Created:**
- `src/components/common/LoadingSpinner.tsx`
- `src/components/common/ErrorBoundary.tsx`

**Dependencies:**
```bash
npm install notistack
```

**Updated:**
- All components with API calls

---

#### **Commit 23: Add form validation and user feedback**
**Tasks:**
- Improve form validations across all forms
- Add helper text for form fields
- Add success/error toast notifications
- Consistent error messages

**Updated:**
- All form components
- `src/utils/validators.ts`

---

#### **Commit 24: Implement responsive design for mobile/tablet**
**Tasks:**
- Test and fix layout on mobile devices
- Responsive table (horizontal scroll or card view)
- Responsive sidebar (drawer)
- Adjust spacing and typography

**Updated:**
- All layout components
- Theme breakpoints

---

#### **Commit 25: Add utility functions and helpers**
**Tasks:**
- Create date formatting utilities
- Create CTR calculation helpers
- Create string manipulation utilities
- Create number formatting utilities

**Files Created:**
- `src/utils/formatDate.ts`
- `src/utils/calculateCTR.ts`
- `src/utils/formatters.ts`

---

#### **Commit 26: Add documentation and comments**
**Tasks:**
- Add JSDoc comments to all services
- Add component prop types documentation
- Update README with setup instructions
- Add inline comments for complex logic

**Updated:**
- All service files
- All component files
- `README.md`

---

#### **Commit 27: Security enhancements and token refresh**
**Tasks:**
- Implement token refresh logic
- Add request retry on 401 errors
- Secure environment variables
- Add CORS handling

**Updated:**
- `src/services/api.ts`
- `src/services/authService.ts`

---

#### **Commit 28: Add analytics charts (optional enhancement)**
**Tasks:**
- Install Recharts
- Create PerformanceChart component
- Add line/bar charts for trends
- Add chart to Analytics page

**Dependencies:**
```bash
npm install recharts
```

**Files Created:**
- `src/components/analytics/PerformanceChart.tsx`

**Updated:**
- `src/pages/AnalyticsPage.tsx`

---

#### **Commit 29: Production build optimization**
**Tasks:**
- Configure Vite for production
- Enable code splitting
- Optimize bundle size
- Add compression

**Updated:**
- `vite.config.ts`

---

#### **Commit 30: Final testing and bug fixes**
**Tasks:**
- Test all user flows
- Fix any bugs found
- Cross-browser testing
- Accessibility improvements
- Update version to 1.0.0

**Updated:**
- Various files (bug fixes)
- `package.json` (version)

---

## 🔧 **ENVIRONMENT VARIABLES**

```env
# .env.example
VITE_API_BASE_URL=http://localhost:3000/api
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## 🧪 **TESTING CHECKLIST**

### **Authentication:**
- [ ] Admin can login with Google Sign-In
- [ ] Non-admin Google users see error and cannot access
- [ ] Admin role verification works correctly
- [ ] Token refresh works correctly
- [ ] Logout clears session and Firebase auth
- [ ] Protected routes redirect to login

### **Campaigns:**
- [ ] Can view all campaigns
- [ ] Can create new campaign with zone_id (UUID) and message
- [ ] Campaign creation validates all fields
- [ ] Zone dropdown loads correctly (displays zone names, stores UUIDs)
- [ ] Can activate/deactivate campaigns using integer campaign_id
- [ ] Only one campaign active per zone
- [ ] Activating one campaign deactivates others for same zone
- [ ] Can delete campaigns (if endpoint available)
- [ ] Confirmation dialog appears before delete
- [ ] Table updates after actions
- [ ] Campaign displays zone name (not campaign name)

### **Analytics:**
- [ ] Summary metrics display correctly
- [ ] Zone performance table shows data
- [ ] CTR calculated correctly (as decimal, displayed as percentage)
- [ ] Table sorting works
- [ ] Zone IDs are UUIDs in analytics data
- [ ] Charts render correctly (if added)

### **Profile:**
- [ ] Profile displays user info (from Google account)
- [ ] Shows Google account email and name
- [ ] Shows admin role badge
- [ ] Logout works from profile
- [ ] Profile avatar shows Google profile picture or initials
### **UI/UX:**
- [ ] Responsive on mobile devices
- [ ] Loading states show during API calls
- [ ] Error messages display for failed requests
- [ ] Success notifications appear
- [ ] Navigation highlights active page
- [ ] No console errors

---

## 🚀 **DEPLOYMENT**

### **Build for Production:**
```bash
npm run build
```

### **Deployment Platforms:**
- **Vercel** (recommended for Vite projects)
- **Netlify**
- **Firebase Hosting**
- **AWS S3 + CloudFront**

### **Post-Deployment:**
- Configure environment variables on hosting platform
- Set up custom domain (e.g., admin.geoengage.com)
- Enable HTTPS
- Configure CORS on backend for admin domain

---

## 📦 **PACKAGE.JSON OVERVIEW**

```json
{
  "name": "geoengage-admin-web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@mui/material": "^5.15.0",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^5.15.0",
    "@mui/x-date-pickers": "^6.18.0",
    "axios": "^1.6.0",
    "firebase": "^10.7.0",
    "@tanstack/react-query": "^5.12.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "notistack": "^3.0.1",
    "dayjs": "^1.11.10",
    "recharts": "^2.10.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.50.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0"
  }
}
```

---

## ✅ **SUCCESS CRITERIA**

### **Functionality:**
- ✅ Admin can login and access all pages
- ✅ Admin can create, edit, activate/deactivate, and delete campaigns
- ✅ Admin can view analytics with zone-wise breakdown
- ✅ Admin can manage their profile
- ✅ All API integrations work correctly

### **UI/UX:**
- ✅ Matches provided UI designs
- ✅ Responsive on all screen sizes
- ✅ Professional and clean design
- ✅ Intuitive navigation

### **Code Quality:**
- ✅ TypeScript with proper types
- ✅ Clean component structure
- ✅ Reusable components
- ✅ Proper error handling
- ✅ Well-documented code

### **Performance:**
- ✅ Fast page loads
- ✅ Optimized bundle size
- ✅ Efficient API calls with caching

---

## 📞 **BACKEND INTEGRATION CHECKLIST**

For backend team to verify/implement:

- [ ] `POST /api/v1/campaigns` - Create campaign endpoint ready
  - [ ] Accepts `zone_id` as UUID string
  - [ ] Accepts `message` as string
  - [ ] No `campaign_name` field needed in request
- [ ] `GET /api/v1/campaigns` - List campaigns endpoint ready
  - [ ] Optional `zone_id` query parameter (UUID string)
  - [ ] Returns campaigns with zone_name included
- [ ] `PUT /api/v1/campaigns/{campaign_id}` - Activate/deactivate endpoint ready
  - [ ] `campaign_id` is integer in URL path
  - [ ] Accepts `{ active: boolean }` in request body
  - [ ] Only one active campaign per zone (auto-deactivate others)
- [ ] `GET /api/v1/analytics` - Dashboard analytics endpoint ready
  - [ ] Returns summary metrics and zone breakdown
  - [ ] zone_id as UUID in response
- [ ] `GET /api/v1/zones` - Get zones endpoint ready
  - [ ] Returns zones with UUID as `id`
  - [ ] Optional `floor_id` query parameter (integer)
  - [ ] Includes floor_name in response
- [ ] `GET /api/v1/floors` - Get floors endpoint ready
  - [ ] Returns all floors with floor_number
- [ ] `DELETE /api/v1/campaigns/{campaign_id}` - Delete endpoint (verify if available)
  - [ ] campaign_id is integer in URL path
- [ ] Ensure admin role validation on all admin endpoints
- [ ] Test with admin Firebase tokens from Google Sign-In
- [ ] Configure CORS for admin web domain
- [ ] Verify campaign activation logic (one active per zone)
- [ ] Add rate limiting for admin endpoints

## 🎯 **NEXT STEPS AFTER COMPLETION**

1. User acceptance testing with actual admins
2. Performance monitoring setup
3. Error tracking (Sentry/LogRocket)
4. Analytics tracking (Google Analytics)
5. A/B testing for campaign effectiveness
6. Additional features:
   - Campaign scheduling
   - User segmentation for targeted campaigns
   - Email notifications for admins
   - Export analytics to CSV/PDF
   - Bulk campaign operations
   - Campaign templates

---

**END OF ADMIN WEB PLAN**
