# Pillora — Feature Overview

Pillora is a comprehensive medication management mobile application built with **Expo (React Native)** and **Supabase**. It helps users track their medications, set reminders, find pharmacies, generate medical reports, and more.

---

## 1. User Authentication & Security

- **Email/Password Authentication** — Standard sign-up and login via Supabase Auth with session management.
- **Biometric Login** — Fingerprint and Face ID support using `expo-local-authentication`. Users can enable/disable biometric authentication from the Privacy & Security settings. Refresh tokens are stored securely via `expo-secure-store`.
- **Password Management** — In-app password change with current password verification. Password reset via deep-linked email flows.
- **Account Deletion** — Users can permanently delete their account and all associated data through a Supabase RPC call.
- **Privacy Controls** — Toggleable settings for data sharing, analytics tracking, and marketing communications, each with confirmation dialogs.

---

## 2. Medication Management

- **Add & Track Medications** — Users can add medicines with details including name, dosage, generic name, current stock, and expiry date.
- **Active Medication List** — A dedicated screen (`meds.tsx`) displays all current medications with stock levels and expiry status.
- **Stock Tracking** — Real-time monitoring of remaining medication quantities. Stock is automatically updated when refill orders are completed.
- **Expiry Monitoring** — Automatic identification of expired medicines with visual indicators and prompts for disposal.

---

## 3. Smart Medicine Scanning (OCR)

- **Camera & Gallery Scanning** — Users can scan medicine packaging by taking a photo or selecting an image from their gallery using `expo-image-picker`.
- **OCR Text Extraction** — Integrates with the **OCR.space API** to extract text from medicine packaging images.
- **Automatic Data Parsing** — Extracted text is parsed to identify the medicine name and dosage information, pre-filling the medication entry form to simplify data entry.

---

## 4. Medication Reminders & Intake Tracking

- **Scheduled Reminders** — Users can create daily medication reminders with customizable times using `expo-notifications` for local push notifications.
- **Intake Confirmation** — When a reminder fires, users are taken to a confirmation screen (`intake/confirm.tsx`) where they can log that they took their medication. The intake is recorded with a timestamp in the Supabase `intake` table.
- **Missed Dose Logging** — The system automatically detects and logs missed intakes when users fail to confirm a dose within the expected timeframe.
- **Reminder CRUD** — Full create, read, update, and delete operations for managing reminders.

---

## 5. Pharmacy Locator

- **Geolocation-Based Search** — Uses `expo-location` to detect the user's current position and find nearby pharmacies from the Supabase database.
- **Distance Calculation** — Calculates real distances using the Haversine formula and sorts pharmacies by proximity.
- **Pharmacy Details** — Displays pharmacy name, address, phone number, ratings, and working hours.
- **Filtering Options** — Filter pharmacies by nearest, currently open, or top-rated.
- **Navigation & Calling** — Direct integration to call pharmacies or navigate to their location.

---

## 6. Online Refill & Payment

- **Refill Ordering Workflow** — A multi-step process (Pharmacy → Quantity → Payment) for ordering medicine refills online.
- **Pharmacy Selection** — Users select a nearby pharmacy for their refill order, with estimated ready times based on distance.
- **Stripe Payment Integration** — Secure payment processing via **Stripe** using Supabase Edge Functions to create PaymentIntents. Supports the full Stripe payment sheet flow.
- **Order Management** — Orders are recorded in the database with status tracking (pending, preparing, ready, collected).
- **Receipt Generation** — Automatic receipt creation after successful payment, with receipt data stored in the database.
- **Stock Auto-Update** — Medication stock levels are automatically increased after a successful refill purchase.

---

## 7. Analytics & Reporting

- **Adherence Tracking** — Tracks medication intake adherence over multiple time periods: weekly, monthly, quarterly, and yearly.
- **Visual Analytics** — Displays adherence data through charts and visualizations using `react-native-svg`.
- **Streak Tracking** — Monitors consecutive days of medication adherence.
- **Missed Dose Statistics** — Calculates and displays missed dose counts and patterns.
- **Medication Breakdown** — Per-medication adherence statistics and intake history.

---

## 8. Medical Reports

- **PDF Report Generation** — Users can generate comprehensive PDF medical reports based on their medication intake history using `expo-print`.
- **Cloud Backup** — Reports are uploaded and stored in Supabase Storage (`medical-reports` bucket) for persistent access.
- **Report Sharing** — A dedicated sharing screen (`shareReport.tsx`) allows users to share reports via the device's native sharing capabilities using `expo-sharing`.
- **Report History** — Users can view and manage previously generated reports from their profile.

---

## 9. Medicine Disposal

- **Expired Medicine Detection** — Identifies medicines that have passed their expiry date from the user's medication list.
- **Disposal Workflow** — A guided process (`disposalScreen.tsx`) that walks users through safe medicine disposal.
- **Drop-Off Site Locator** — Helps users find nearby medicine disposal/drop-off locations.
- **Home Disposal Steps** — Provides step-by-step instructions for safe home disposal when drop-off sites are not accessible.
- **Disposal History** — Tracks completed disposals in the user's profile.

---

## 10. Intelligent Chatbot

- **Floating Interface** — A draggable, floating chatbot button (`FloatingChatbot.tsx`) accessible from any screen within the app.
- **Keyword-Based AI Engine** — The `SupabaseChatbot` uses a smart keyword detection and rule engine to answer user queries about medications, side effects, dosages, and app features.
- **Medicine Information Lookup** — Can query the Supabase database for specific medicine details in real-time.
- **Admin Training Mode** — An admin-protected mode (password-gated) that allows administrators to train new intents, patterns, and responses directly within the app.
- **Cloud Sync** — Trained intents are synchronized with the Supabase database for persistence and cross-device availability.

---

## 11. Admin / Pharmacist Dashboard

- **Order Management** — Pharmacists can view and manage incoming orders for their pharmacy via a dedicated dashboard (`admin-dashboard.tsx`).
- **Real-Time Updates** — Uses Supabase real-time subscriptions (`postgres_changes`) to receive instant order updates without page refresh.
- **Order Status Workflow** — Orders progress through statuses: Pending → Preparing → Ready → Collected, with visual stat cards for each status.
- **Order Filtering** — Filter orders by status with a horizontal scrollable filter bar.
- **Inventory Management** — Separate inventory tab for managing pharmacy stock levels (`admin-inventory`).
- **Order Details View** — Drill-down into individual orders with full details and status update capabilities.

---

## 12. Guided App Tour (Onboarding)

- **Interactive Walkthrough** — A `TourOverlay` component provides first-time users with a guided tour of the app's main features on the home screen.
- **Animated Highlights** — Uses pulse animations and spotlight effects to draw attention to key UI elements (active medications, scan, reminders, pharmacy locator, analytics).
- **Step Navigation** — Users can navigate forward/backward through tour steps, skip the tour, or restart it.
- **User-Specific Persistence** — Tour completion status is stored per-user in `AsyncStorage`, so the tour only shows automatically for new users.
- **Manual Re-Trigger** — A floating "Start Tour" button remains on the home screen for users who want to revisit the tour.

---

## 13. User Profile & Settings

- **Profile Management** — Users can view and edit their profile information.
- **Order History** — View past refill orders and their statuses.
- **Disposal History** — Track previously disposed medications.
- **Privacy & Security Settings** — Centralized settings screen for managing biometrics, password, data sharing, and account deletion.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| **Framework** | Expo (React Native) |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) |
| **Payments** | Stripe (`@stripe/stripe-react-native`) |
| **Navigation** | `expo-router` (file-based routing) |
| **Notifications** | `expo-notifications` (local push) |
| **OCR** | OCR.space API |
| **Biometrics** | `expo-local-authentication` + `expo-secure-store` |
| **PDF Generation** | `expo-print` |
| **File Sharing** | `expo-sharing` + `expo-file-system` |
| **Charts** | `react-native-svg` |
| **Local Storage** | `@react-native-async-storage/async-storage` |
