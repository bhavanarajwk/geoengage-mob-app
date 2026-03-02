# 🔍 401 Unauthorized Debugging Guide

## The Problem
- ✅ **Swagger works** - Manual JWT token works fine in Swagger
- ❌ **App fails** - Same endpoint returns 401 when called from the app

## Root Cause Analysis

The app now has **comprehensive debugging** that will reveal the exact issue.

## How to Debug

### Step 1: Sign in to the app and check logs

Look for these key sections in the logs:

### 📋 Section 1: Firebase Sign-In Token
```
╔══════════════════════════════════════════════════════════════════╗
║           FIREBASE AUTHENTICATION SUCCESS ✅                     ║
╠══════════════════════════════════════════════════════════════════╣
║ JWT TOKEN FROM SIGN-IN (Copy this to test in Swagger):          ║
╠══════════════════════════════════════════════════════════════════╣
eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5ZjE3...  <-- YOUR SIGN-IN TOKEN
```

**Action**: Copy this token and test it in Swagger. Does it work?
- ✅ **Yes** → Token from sign-in is valid, continue to Step 2
- ❌ **No** → Firebase project configuration issue (check project ID, service account)

---

### 📋 Section 2: Auth State Confirmation
```
╔══════════════════════════════════════════════════════════════════╗
║              WAITING FOR AUTH STATE TO SETTLE                    ║
╚══════════════════════════════════════════════════════════════════╝
✅ Auth state confirmed!
✅ auth().currentUser is now set
```

**Action**: Verify auth state is confirmed
- ✅ **Confirmed** → Good, continue to Step 3
- ⚠️ **Timeout** → But check if currentUser is set
- ❌ **currentUser NULL** → Critical race condition issue

---

### 📋 Section 3: API Request Token
```
╔══════════════════════════════════════════════════════════════════╗
║                       API REQUEST DEBUG                          ║
╠══════════════════════════════════════════════════════════════════╣
║ FULL JWT TOKEN (Copy this to compare with Swagger):             ║
╠══════════════════════════════════════════════════════════════════╣
eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5ZjE3...  <-- YOUR API REQUEST TOKEN
```

**Action**: Compare this token with the token from Section 1
- ✅ **Same token** → Token is consistent, continue to Step 4
- ❌ **Different token** → Token changed between sign-in and API call (unexpected!)
- ❌ **Missing this section** → auth().currentUser was NULL → Fix race condition

---

### 📋 Section 4: JWT Payload/Claims
```
║ JWT PAYLOAD (Claims):                                            ║
{
  "iss": "https://securetoken.google.com/YOUR_PROJECT_ID",
  "aud": "YOUR_PROJECT_ID",
  "auth_time": 1234567890,
  "user_id": "abc123...",
  "sub": "abc123...",
  "iat": 1234567890,
  "exp": 1234571490,
  "email": "user@example.com",
  "email_verified": true,
  "firebase": {
    "identities": {
      "google.com": ["1234567890"],
      "email": ["user@example.com"]
    },
    "sign_in_provider": "google.com"
  }
}
```

**Critical checks**:
1. `"iss"` - Should be `https://securetoken.google.com/YOUR_PROJECT_ID`
2. `"aud"` - Should match your Firebase project ID
3. `"exp"` - Token not expired (check "Time Until Exp")
4. `"email"` - User email is present

**Action**: Verify these claims
- ✅ **All correct** → Token structure is valid, continue to Step 5
- ❌ **Wrong project ID** → Backend configured for different Firebase project
- ❌ **Token expired** → Should auto-refresh (check getIdToken(true) call)

---

### 📋 Section 5: Request Headers
```
║ Request Headers:                                                 ║
{
  "Authorization": "Bearer <token_shown_above>",
  "Content-Type": "application/json",
  "Accept": "application/json",
  "ngrok-skip-browser-warning": "true"
}
```

**Action**: Verify headers
- ✅ **Authorization present** → Good
- ❌ **Authorization missing** → Check interceptor

---

### 📋 Section 6: Backend Response (401 Error)
```
╔══════════════════════════════════════════════════════════════════╗
║                      ❌ API RESPONSE ERROR                        ║
╠══════════════════════════════════════════════════════════════════╣
║ Status:   401                                                    ║
║ 🚫 AUTHENTICATION FAILED - 401 Unauthorized                      ║
╠══════════════════════════════════════════════════════════════════╣
║ Backend Response:                                                ║
{
  "detail": "Invalid authentication credentials"
}
```

**Action**: Check backend error message
- `"Invalid authentication credentials"` → Backend JWT verification failed
- `"No authorization header"` → Headers not sent properly
- `"Token expired"` → Check token expiry in Section 4
- `"Invalid token"` → Backend can't decode/verify token

---

## Common Issues & Solutions

### Issue 1: Different tokens between sign-in and API request
**Symptom**: Token in Section 1 ≠ Token in Section 3  
**Cause**: Token was refreshed between sign-in and API call  
**Solution**: This is actually expected! The interceptor calls `getIdToken(true)` to force refresh. Both tokens should work in Swagger.

### Issue 2: auth().currentUser is NULL
**Symptom**: No API request logs, just critical error  
**Cause**: Race condition not fixed  
**Solution**: Already implemented waiting logic, but check timeout messages

### Issue 3: Backend can't verify token
**Symptom**: Valid token in app fails in backend  
**Possible causes**:
1. **Backend Firebase project mismatch**
   - Backend configured for `project-a`, app uses `project-b`
   - Check `aud` claim in JWT (Section 4) vs backend Firebase config
   
2. **Backend Firebase Admin SDK not initialized**
   - Missing `serviceAccountKey.json`
   - Check backend logs for Firebase initialization errors
   
3. **Backend reading wrong header**
   - Backend expects `Authorization` but reads something else
   - Check backend dependency injection for `get_current_user()`

4. **CORS/DevTunnel issue**
   - Headers stripped by proxy
   - Check backend CORS configuration

### Issue 4: Token expired
**Symptom**: `"exp"` in past, "Time Until Exp: -X minutes"  
**Solution**: Interceptor should auto-refresh with `getIdToken(true)`. If not working, check Firebase auth state.

---

## What to Send to Backend Team

Copy and send these sections from your logs:

1. **Full JWT Token** (from Section 3)
   ```
   eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5ZjE3...
   ```

2. **JWT Payload** (from Section 4)
   ```json
   {
     "iss": "https://securetoken.google.com/YOUR_PROJECT",
     "aud": "YOUR_PROJECT",
     ...
   }
   ```

3. **Backend Error Response** (from Section 6)
   ```json
   {
     "detail": "Invalid authentication credentials"
   }
   ```

4. **Questions to ask backend**:
   - What Firebase project ID is your backend configured for?
   - Can you manually decode this JWT token on jwt.io?
   - What error do you see in your backend logs when processing this request?
   - Is your Firebase Admin SDK initialized correctly?
   - Are you reading the `Authorization` header correctly?

---

## Testing the same token in Swagger

1. Copy the token from **Section 3** (API Request Token)
2. Open Swagger UI
3. Click "Authorize" button
4. Paste token in `Bearer <token>` field
5. Try the same endpoint

**If Swagger works with this token but app fails:**
- Issue is NOT the token itself
- Issue is in how the request is constructed/sent
- Check headers, URL, request method

**If Swagger also fails with this token:**
- Issue IS the token
- Check JWT claims (Section 4)
- Verify Firebase project configuration match

---

## Expected Flow (Working)

1. ✅ User signs in → Firebase token generated
2. ✅ Auth state updates → `auth().currentUser` set
3. ✅ App calls API → Interceptor gets fresh token
4. ✅ Token attached to request → `Authorization: Bearer <token>`
5. ✅ Backend receives request → Verifies JWT
6. ✅ Backend returns 200 OK

---

## Next Steps

Run the app, sign in, and **carefully review all 6 sections** in your logs. The answer will be there!
