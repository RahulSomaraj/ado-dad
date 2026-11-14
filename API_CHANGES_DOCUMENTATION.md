# API Changes Documentation

This document provides a comprehensive overview of all API changes made, organized in tabular format for easy reference.

## Table of Contents
1. [Phone Number Refactoring Changes](#phone-number-refactoring-changes)
2. [Ads API Changes](#ads-api-changes)
3. [User API Changes](#user-api-changes)
4. [Authentication API Changes](#authentication-api-changes)
5. [Response DTO Changes](#response-dto-changes)
6. [Bug Fixes](#bug-fixes)

---

## Phone Number Refactoring Changes

### Overview
All APIs have been updated to use `countryCode` and `phoneNumber` instead of the single `phone` field. This enables better international phone number support and validation.

| API Endpoint | Method | Change Type | Old Field | New Fields | Impact |
|-------------|--------|-------------|-----------|------------|--------|
| All User Response DTOs | - | Field Change | `phone?: string` | `countryCode?: string`<br>`phoneNumber?: string` | Breaking - Frontend must update to use new fields |
| User Creation | `POST /users` | Request Change | `phone: string` | `countryCode: string`<br>`phoneNumber: string` | Breaking - Must provide both fields |
| User Update | `PUT /users/:id` | Request Change | `phone?: string` | `countryCode?: string`<br>`phoneNumber?: string` | Breaking - Must provide both fields if updating |
| User Login | `POST /auth/login` | Response Change | `phone: string` | `countryCode: string`<br>`phoneNumber: string` | Breaking - Response structure changed |
| Token Refresh | `POST /auth/refresh` | Response Change | `phone: string` | `countryCode: string`<br>`phoneNumber: string` | Breaking - Response structure changed |
| Send OTP | `POST /users/send-otp` | Internal Change | Uses `phone` | Uses `countryCode` + `phoneNumber` | Non-breaking - Same request format |
| All Ads Endpoints | Various | Response Change | `user.phone?: string` | `user.countryCode?: string`<br>`user.phoneNumber?: string` | Breaking - Response structure changed |
| Favorites Endpoints | Various | Response Change | `user.phone?: string` | `user.countryCode?: string`<br>`user.phoneNumber?: string` | Breaking - Response structure changed |
| User Reports | `GET /users/reports` | Response Change | `reportedUserDetails.phone: string` | `reportedUserDetails.countryCode: string`<br>`reportedUserDetails.phoneNumber: string` | Breaking - Response structure changed |

---

## Ads API Changes

### 1. Admin All Ads Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `GET /ads/admin/all` | `GET /ads/admin/all` | No change |
| **Query Parameters** | Multiple filters:<br>- page<br>- limit<br>- category<br>- search<br>- sortBy<br>- sortOrder<br>- location<br>- price filters<br>- etc. | Only:<br>- page (default: 1)<br>- limit (default: 20, max: 100)<br>- search (optional) | Breaking - Removed many filter options |
| **DTO Used** | `FilterAdDto` | `AdminAllAdsFilterDto` | Breaking - New DTO with limited fields |
| **Response Structure** | `PaginatedDetailedAdResponseDto` | `PaginatedDetailedAdResponseDto` | No change |
| **User Object in Response** | `user.phone?: string` | `user.countryCode?: string`<br>`user.phoneNumber?: string` | Breaking - Field structure changed |
| **Null Values** | Could return null values | Null values removed recursively | Non-breaking - Cleaner responses |
| **Circular Reference Handling** | Could cause stack overflow | Fixed with WeakSet tracking | Bug fix - Prevents crashes |

### 2. All Ads List Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `POST /ads/list` | `POST /ads/list` | No change |
| **Request Body** | `FilterAdDto` | `FilterAdDto` | No change |
| **Response Structure** | `PaginatedDetailedAdResponseDto` | `PaginatedDetailedAdResponseDto` | No change |
| **User Object in Response** | `user.phone?: string` | `user.countryCode?: string`<br>`user.phoneNumber?: string` | Breaking - Field structure changed |
| **Null Values** | Could return null values | Null values removed recursively | Non-breaking - Cleaner responses |

### 3. Get Ad By ID Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `GET /ads/:id` | `GET /ads/:id` | No change |
| **Response Structure** | `DetailedAdResponseDto` | `DetailedAdResponseDto` | No change |
| **User Object in Response** | `user.phone?: string` | `user.countryCode?: string`<br>`user.phoneNumber?: string` | Breaking - Field structure changed |
| **Populate Fields** | `name email phone` | `name email countryCode phoneNumber` | Internal change |

### 4. User Ads Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `GET /ads/user/:userId` | `GET /ads/user/:userId` | No change |
| **Response Structure** | `PaginatedDetailedAdResponseDto` | `PaginatedDetailedAdResponseDto` | No change |
| **User Object in Response** | `user.phone?: string` | `user.countryCode?: string`<br>`user.phoneNumber?: string` | Breaking - Field structure changed |

### 5. My Ads Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `POST /ads/my-ads` | `POST /ads/my-ads` | No change |
| **Response Structure** | `PaginatedDetailedAdResponseDto` | `PaginatedDetailedAdResponseDto` | No change |
| **User Object in Response** | `user.phone?: string` | `user.countryCode?: string`<br>`user.phoneNumber?: string` | Breaking - Field structure changed |

---

## User API Changes

### 1. Create User Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `POST /users` | `POST /users` | No change |
| **Request Body** | `{ phone: string, ... }` | `{ countryCode: string, phoneNumber: string, ... }` | Breaking - Field structure changed |
| **Validation** | Basic phone validation | Country-specific validation using `google-libphonenumber` | Enhanced validation |
| **Response** | `GetUserDto` | `GetUserDto` with `countryCode` and `phoneNumber` | Breaking - Response structure changed |

### 2. Update User Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `PUT /users/:id` | `PUT /users/:id` | No change |
| **Request Body** | `{ phone?: string, ... }` | `{ countryCode?: string, phoneNumber?: string, ... }` | Breaking - Field structure changed |
| **Validation** | Basic phone validation | Country-specific validation using `google-libphonenumber` | Enhanced validation |
| **Response** | `GetUserDto` | `GetUserDto` with `countryCode` and `phoneNumber` | Breaking - Response structure changed |

### 3. Get User Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `GET /users/:id` | `GET /users/:id` | No change |
| **Response** | `GetUserDto` with `phone?: string` | `GetUserDto` with `countryCode?: string`<br>`phoneNumber?: string` | Breaking - Response structure changed |

### 4. Send OTP Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `POST /users/send-otp` | `POST /users/send-otp` | No change |
| **Request Body** | `{ identifier: string }` | `{ identifier: string }` | No change - Still accepts phone or email |
| **Internal Processing** | Uses `phone` field | Parses identifier to `countryCode` + `phoneNumber` | Internal change - Non-breaking |
| **MSG91 Integration** | Sends with phone number | Formats with country code before sending | Internal change - Non-breaking |

### 5. User Reports Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `GET /users/reports` | `GET /users/reports` | No change |
| **Response** | `UserReportResponseDto` with `reportedUserDetails.phone: string` | `UserReportResponseDto` with `reportedUserDetails.countryCode: string`<br>`reportedUserDetails.phoneNumber: string` | Breaking - Response structure changed |

---

## Authentication API Changes

### 1. Login Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `POST /auth/login` | `POST /auth/login` | No change |
| **Request Body** | `{ identifier: string, password: string }` | `{ identifier: string, password: string }` | No change |
| **Response** | `LoginResponse` with `phone: string` | `LoginResponse` with `countryCode: string`<br>`phoneNumber: string` | Breaking - Response structure changed |
| **Internal Processing** | Uses `phone` field | Parses identifier to `countryCode` + `phoneNumber` | Internal change - Non-breaking |
| **Backward Compatibility** | N/A | Falls back to 'IN' if `countryCode` missing | Non-breaking - Handles old data |

### 2. Token Refresh Endpoint

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| **Endpoint** | `POST /auth/refresh` | `POST /auth/refresh` | No change |
| **Request Body** | `{ refreshToken: string }` | `{ refreshToken: string }` | No change |
| **Response** | `LoginResponse` with `phone: string` | `LoginResponse` with `countryCode: string`<br>`phoneNumber: string` | Breaking - Response structure changed |
| **Backward Compatibility** | N/A | Falls back to 'IN' if `countryCode` missing | Non-breaking - Handles old data |

---

## Response DTO Changes

### AdResponseDto and DetailedAdResponseDto

| Field | Before | After | Impact |
|-------|--------|-------|--------|
| `user.phone` | `phone?: string` | Removed | Breaking |
| `user.countryCode` | Not present | `countryCode?: string` | New field |
| `user.phoneNumber` | Not present | `phoneNumber?: string` | New field |

### GetUserDto

| Field | Before | After | Impact |
|-------|--------|-------|--------|
| `phone` | `phone?: string` | Removed | Breaking |
| `countryCode` | Not present | `countryCode: string` | New field |
| `phoneNumber` | Not present | `phoneNumber: string` | New field |

### LoginResponseDto

| Field | Before | After | Impact |
|-------|--------|-------|--------|
| `phone` | `phone: string` | Removed | Breaking |
| `countryCode` | Not present | `countryCode: string` | New field |
| `phoneNumber` | Not present | `phoneNumber: string` | New field |

### UserReportResponseDto

| Field | Before | After | Impact |
|-------|--------|-------|--------|
| `reportedUserDetails.phone` | `phone: string` | Removed | Breaking |
| `reportedUserDetails.countryCode` | Not present | `countryCode: string` | New field |
| `reportedUserDetails.phoneNumber` | Not present | `phoneNumber: string` | New field |

---

## Bug Fixes

### 1. Stack Overflow in removeNullValues

| Issue | Before | After | Impact |
|-------|--------|-------|--------|
| **Problem** | `removeNullValues` method caused stack overflow on circular references | Added `WeakSet` to track visited objects | Bug fix - Prevents crashes |
| **Affected Endpoints** | All endpoints returning ad data | All endpoints returning ad data | Critical fix |
| **Error** | `RangeError: Maximum call stack size exceeded` | No error - Circular references skipped | Fixed |

### 2. Null Values in API Responses

| Issue | Before | After | Impact |
|-------|--------|-------|--------|
| **Problem** | API responses could contain null values for nested objects | Recursive null removal implemented | Non-breaking - Cleaner responses |
| **Affected Fields** | `manufacturer`, `model`, `variant`, `fuelType`, `transmissionType`, `vehicleModel` | All nested objects cleaned | Improvement |
| **Error** | Flutter error: `type 'minified' is not a subtype of 'null'` | No error - Null values removed | Fixed |

### 3. Missing countryCode in Login Response

| Issue | Before | After | Impact |
|-------|--------|-------|--------|
| **Problem** | TypeScript error: `Property 'countryCode' is missing` | Added `countryCode` with fallback to 'IN' | Bug fix - Prevents TypeScript errors |
| **Affected Endpoints** | `POST /auth/login`, `POST /auth/refresh` | Both endpoints | Fixed |

### 4. MongoDB User Lookup Projections

| Issue | Before | After | Impact |
|-------|--------|-------|--------|
| **Problem** | User lookups projected `phone: 1` which doesn't exist | Updated to project `countryCode: 1, phoneNumber: 1` | Bug fix - Prevents missing data |
| **Affected Endpoints** | All ads endpoints with user data | All ads endpoints | Fixed |

---

## New DTOs Created

| DTO Name | Purpose | Fields |
|----------|---------|--------|
| `AdminAllAdsFilterDto` | Simplified filter for admin all ads endpoint | `page?: number`<br>`limit?: number`<br>`search?: string` |

---

## Validation Changes

### Phone Number Validation

| Aspect | Before | After |
|--------|--------|-------|
| **Library** | Custom validation logic | `google-libphonenumber` |
| **Country Support** | Limited | All countries supported by the library |
| **Format** | Single `phone` field | `countryCode` (e.g., '+91') + `phoneNumber` |
| **Validation** | Basic format check | Country-specific validation |
| **Parsing** | Manual | Library-based parsing |
| **Formatting** | Manual | E.164 format support |

### Supported Phone Country Codes

The system now supports phone country codes in the format `+XX` (e.g., '+91', '+971', '+1'). The validation automatically converts these to ISO country codes for validation purposes.

---

## Migration Notes

### For Frontend Developers

1. **Update all user object references:**
   - Replace `user.phone` with `user.countryCode` and `user.phoneNumber`
   - Handle cases where these fields might be undefined

2. **Update user creation/update forms:**
   - Add `countryCode` field (dropdown with phone codes like '+91', '+971', etc.)
   - Update `phoneNumber` field to work with the selected country code
   - Implement client-side validation based on country code

3. **Update admin all ads endpoint:**
   - Remove usage of filter parameters other than `page`, `limit`, and `search`
   - Update to use the simplified query parameters

### For Backend Developers

1. **Database Migration:**
   - Existing users may have `phone` field - consider migration script
   - New users must have both `countryCode` and `phoneNumber`

2. **Backward Compatibility:**
   - Login endpoint falls back to 'IN' if `countryCode` is missing
   - Consider adding migration script for existing data

---

## Summary

### Breaking Changes
- ✅ All user-related responses now use `countryCode` and `phoneNumber` instead of `phone`
- ✅ User creation/update requires `countryCode` and `phoneNumber`
- ✅ Admin all ads endpoint now only accepts `page`, `limit`, and `search` parameters

### Non-Breaking Changes
- ✅ Null values are automatically removed from responses
- ✅ Circular reference handling prevents stack overflow
- ✅ Enhanced phone number validation

### Bug Fixes
- ✅ Fixed stack overflow in `removeNullValues` method
- ✅ Fixed null values causing Flutter errors
- ✅ Fixed missing `countryCode` in login responses
- ✅ Fixed MongoDB projections to use new field names

---

**Document Version:** 1.0  
**Last Updated:** December 28, 2025  
**Author:** API Documentation Team

