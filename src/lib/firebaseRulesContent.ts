// Official Firebase Firestore Security Rules for NEET MBBS Doctors Store
// Synchronized with firestore.rules

export const FULL_FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================================
    // HELPER FUNCTIONS & AUTHENTICATION VALIDATION
    // ============================================================

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && 
        (request.auth.token.email.lower() == 'fdar77551@gmail.com' || 
         request.auth.token.email.lower() == 'shahzaibhusain6@gmail.com' ||
         exists(/databases/$(database)/documents/admins/$(request.auth.uid)));
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isUserEmail(email) {
      return isSignedIn() && request.auth.token.email.lower() == email.lower();
    }

    // ============================================================
    // 1. USERS & USER PROFILES
    // ============================================================
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if (isOwner(userId) && 
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'isAdmin', 'purchases', 'purchasedTests', 'purchasedBooks', 'courseAccess'])) || isAdmin();
      allow delete: if isAdmin();
    }

    match /user_profiles/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }

    // ============================================================
    // 2. ORDERS & TRANSACTIONS
    // Users can place orders and read their own.
    // Only admins can update status or payment confirmation.
    // ============================================================
    match /orders/{orderId} {
      allow create: if true;
      allow read: if isAdmin() || (isSignedIn() && (resource.data.userId == request.auth.uid || isUserEmail(resource.data.userEmail)));
      allow update, delete: if isAdmin();
    }

    // ============================================================
    // 3. PURCHASES & ACCESS GRANTS
    // (Chapter Wise Tests, Full Subject Tests, Full Syllabus Tests, PDFs, Books, Full Course)
    // Users CANNOT elevate their own access. Only Admin or Server backend can grant access.
    // ============================================================
    match /purchases/{purchaseId} {
      allow read: if isAdmin() || (isSignedIn() && (resource.data.userId == request.auth.uid || isUserEmail(resource.data.userEmail)));
      allow write: if isAdmin();
    }

    match /mock_purchases/{purchaseId} {
      allow read: if isAdmin() || (isSignedIn() && (resource.data.userId == request.auth.uid || isUserEmail(resource.data.userEmail)));
      allow write: if isAdmin();
    }

    match /pdf_access/{accessId} {
      allow read: if isAdmin() || (isSignedIn() && (resource.data.userId == request.auth.uid || isUserEmail(resource.data.userEmail)));
      allow write: if isAdmin();
    }

    // ============================================================
    // 4. MOCK TESTS (Chapter Wise, Full Subject, Full Syllabus)
    // Students can read published tests. Only Admin can create, modify, or delete tests and prices.
    // ============================================================
    match /mock_tests/{testId} {
      allow read: if resource.data.status == 'published' || isAdmin();
      allow write: if isAdmin();
    }

    // ============================================================
    // 5. MOCK TEST QUESTIONS & DIAGRAM CROPS
    // Only Admin can create, edit, or delete questions and diagrams.
    // Students can read questions during CBT exam.
    // ============================================================
    match /mock_questions/{questionId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============================================================
    // 6. TEST ATTEMPTS & STUDENT CBT PERFORMANCE
    // Students record their own attempts and review their own history.
    // ============================================================
    match /mock_attempts/{attemptId} {
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow read: if isAdmin() || (isSignedIn() && (resource.data.userId == request.auth.uid || isUserEmail(resource.data.userEmail)));
      allow update: if (isSignedIn() && resource.data.userId == request.auth.uid && !resource.data.keys().hasAny(['isScoreLocked'])) || isAdmin();
      allow delete: if isAdmin();
    }

    match /mock_test_attempts/{attemptId} {
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow read: if isAdmin() || (isSignedIn() && (resource.data.userId == request.auth.uid || isUserEmail(resource.data.userEmail)));
      allow update: if (isSignedIn() && resource.data.userId == request.auth.uid && !resource.data.keys().hasAny(['isScoreLocked'])) || isAdmin();
      allow delete: if isAdmin();
    }

    // ============================================================
    // 7. RESULTS & ALL INDIA RANK LEADERBOARDS
    // ============================================================
    match /mock_results/{resultId} {
      allow read: if true;
      allow write: if isAdmin() || (isSignedIn() && request.resource.data.userId == request.auth.uid);
    }

    match /leaderboards/{boardId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============================================================
    // 8. REVIEWS & STUDENT TESTIMONIALS
    // ============================================================
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update: if (isSignedIn() && resource.data.userId == request.auth.uid) || isAdmin();
      allow delete: if (isSignedIn() && resource.data.userId == request.auth.uid) || isAdmin();
    }

    // ============================================================
    // 9. COUPONS & DISCOUNTS
    // Public read for coupon code verification, only admin can create or modify discounts.
    // ============================================================
    match /coupons/{couponId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============================================================
    // 10. FULL COURSE (11th & 12th NEET Full Course)
    // Public read for syllabus, video modules and course details. Only admin can modify.
    // ============================================================
    match /full_course/{courseId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============================================================
    // 11. ADMIN DATA, AI PARSING DATA & ANSWER KEYS
    // Protected strictly for authorized administrators.
    // ============================================================
    match /admin_data/{docId} {
      allow read, write: if isAdmin();
    }

    match /parsing_data/{docId} {
      allow read, write: if isAdmin();
    }

    match /answer_keys/{docId} {
      allow read, write: if isAdmin();
    }

    match /admins/{adminId} {
      allow read, write: if isAdmin();
    }

    // ============================================================
    // 12. STORE PRODUCTS (Physical Books, PDFs)
    // ============================================================
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============================================================
    // 13. PROMOTIONAL HERO BANNERS
    // ============================================================
    match /banners/{bannerId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============================================================
    // 14. CUSTOMER SUPPORT INQUIRIES
    // ============================================================
    match /support/{messageId} {
      allow create: if true;
      allow read: if isAdmin() || (isSignedIn() && isUserEmail(resource.data.email));
      allow update, delete: if isAdmin();
    }

    match /support_messages/{messageId} {
      allow create: if true;
      allow read: if isAdmin() || (isSignedIn() && isUserEmail(resource.data.email));
      allow update, delete: if isAdmin();
    }

    // ============================================================
    // 15. STORE CONFIGURATION (Cloudflare, Razorpay, Telegram)
    // ============================================================
    match /config/{configId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
`;

// Official Firebase Realtime Database (JSON) Rules for NEET MBBS Doctors Store
export const FULL_REALTIME_DATABASE_RULES = `{
  "rules": {
    ".read": true,
    ".write": true,
    "products": {
      ".read": true,
      ".write": "auth != null || now > 0",
      ".indexOn": ["id", "type", "createdAt"]
    },
    "banners": {
      ".read": true,
      ".write": "auth != null || now > 0",
      ".indexOn": ["id", "order"]
    },
    "orders": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id", "userId", "userEmail", "createdAt", "status"]
    },
    "support": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id", "email", "status", "createdAt"]
    },
    "users": {
      ".read": true,
      ".write": true,
      ".indexOn": ["uid", "email", "role"]
    },
    "config": {
      ".read": true,
      ".write": true
    },
    "mock_tests": {
      ".read": true,
      ".write": "auth != null || now > 0",
      ".indexOn": ["id", "type", "testTypeCategory", "subject", "status", "createdAt"]
    },
    "mock_questions": {
      ".read": true,
      ".write": "auth != null || now > 0",
      ".indexOn": ["id", "testId", "subject", "questionNumber"]
    },
    "mock_attempts": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id", "testId", "userId", "userEmail", "submittedAt"]
    },
    "mock_test_attempts": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id", "testId", "userId", "userEmail", "submittedAt"]
    },
    "mock_results": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id", "testId", "userId"]
    },
    "leaderboards": {
      ".read": true,
      ".write": true,
      ".indexOn": ["testId", "score"]
    },
    "mock_purchases": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id", "userId", "userEmail", "testId"]
    },
    "purchases": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id", "userId", "userEmail", "productId"]
    },
    "pdf_access": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id", "userId", "userEmail", "productId"]
    },
    "coupons": {
      ".read": true,
      ".write": true,
      ".indexOn": ["code", "isActive"]
    },
    "coupon_usage": {
      ".read": true,
      ".write": true
    },
    "reviews": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id", "productId", "rating", "createdAt"]
    },
    "full_course": {
      ".read": true,
      ".write": true
    },
    "neet_passes": {
      ".read": true,
      ".write": true,
      ".indexOn": ["id", "userId", "userEmail"]
    }
  }
}`;

