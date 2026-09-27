# TripMates Architecture

## Overview
TripMates is a travel matching platform designed to help people discover compatible travelers, create trips, share costs, and coordinate group travel in a safe, trusted community.

This repo currently implements the frontend-first application shell and the core product flows in React + Vite + TypeScript. The project also includes a production-ready backend architecture blueprint in Prisma and environment configuration for future API and database integration.

## Current Frontend Stack
- React 19
- Vite 8
- TypeScript 5
- React Router 8
- Tailwind CSS v4
- Custom premium UI system with black/white, emerald accents, rounded cards, and mobile-first layouts

## Current Product Modules
- Landing experience
- Authentication flow and protected routes
- Personalized dashboard
- Discover trips and people
- Trip hub with chat/timeline/member views
- Create trip wizard and trip list view
- Wallet, safety, community, profile, hotel, cab, scooter, map, seasonal trip, and admin dashboard screens

## Security & Access Model
- Route protection uses authenticated state and allowed role gating
- Roles include USER, TRAVEL_AGENT, ADMIN
- Auth state is persisted in browser storage for the current prototype environment

## Backend Architecture Blueprint
The project includes a Prisma schema for a production-grade system:
- Users and verification flow
- Travel preferences and personality profiles
- Trust scores and compatibility matching
- Trips, memberships, expenses, wallets, reviews, and chat
- Notifications, itinerary plans, join requests, and audit logs

## Environment Configuration
The project includes `.env.example` with placeholders for:
- App URL and auth secrets
- Google OAuth
- Postgres database
- OpenAI API
- Razorpay
- Google Maps
- Cloudinary
- Resend
- monitoring and security settings

## Recommended Production Evolution
The next production expansion should include:
- Next.js App Router backend routes
- Prisma migrations and Postgres deployment
- Auth.js / NextAuth with OAuth + session handling
- Secure trip creation API with Zod validation
- Google Maps autocomplete and map rendering
- Weather API integration
- AI trip planning and compatibility recommendation endpoints
- ImageUpload API with signed URLs / cloud storage
- Draft and publish workflow with audit logging
- Payment integration and trip wallet settlement

## Directory Notes
- `src/pages` contains the product screens
- `src/lib` contains mock data, auth, compatibility logic, and validation helpers
- `src/components` contains shared UI and route guards
- `prisma/schema.prisma` contains the database model blueprint
- `.env.example` contains environment configuration placeholders

## Validation
The application is currently validated by running the Vite production build successfully.
