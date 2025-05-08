# Trash Map ATX - Report, Map, and Locate Litter

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://trash-mapper.vercel.app)

Trash Mapper is a web application that allows users to report and visualize litter hotspots on an interactive map. It aims to crowdsource litter data, encourage cleanup efforts, and provide insights into pollution patterns.

## Overview

Users can submit reports including an image of the litter, its location, and a severity rating. Submitted images undergo AI validation to ensure they depict actual litter in an appropriate outdoor environment. The application also includes gamification elements, awarding points for submitting reports and marking them as cleaned.

## Key Features

*   **Interactive Map:** Visualize litter reports using Leaflet.
*   **Report Submission:** Users can submit new litter reports with image uploads, geolocation, and severity level.
*   **AI Image Validation:** OpenAI's vision model analyzes submitted images to verify litter presence and environment validity.
*   **User Authentication:** Secure user accounts managed via Supabase Auth.
*   **Mark as Cleaned:** Users can mark reports as cleaned, contributing to data accuracy.
*   **Gamification:** Earn points for submitting reports and marking them cleaned, tracking progress via user stats.
*   **Image Optimization:** Images are optimized using Sharp before storage.

## Technology Stack

*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS
*   **Mapping:** Pigeon Maps
*   **Backend:** Next.js API Routes
*   **Database & Auth:** Supabase (PostgreSQL, Auth, Storage)
*   **AI:** OpenAI API (GPT-4 Vision)
*   **Image Processing:** Sharp

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   A Supabase account and project
*   An OpenAI API key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory and add your Supabase project URL, anon key, and OpenAI API key:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    OPENAI_API_KEY=YOUR_OPENAI_API_KEY

    # You might also need these for server-side Supabase client
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY # If using server-side operations requiring admin privileges
    ```
    *Note: Obtain your Supabase keys from your project's dashboard (Project Settings > API).*

4.  **Set up Supabase Database:**
    *   Ensure you have the necessary tables (`reports`, `user_stats`) and RLS policies configured in your Supabase project. Refer to the database schema details within the project or apply the necessary migrations (if available in `supabase/migrations`).
    *   Set up Supabase Storage for `report-images`.

5.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1.  Sign up or log in using your email.
2.  Navigate the map to view existing litter reports.
3.  Click on the map or use the "Add Report" button to submit a new litter sighting.
4.  Upload an image, confirm the location, and set the severity.
5.  If you clean up reported litter, find the report on the map and mark it as cleaned.
6.  Check your profile or a dedicated stats page (if implemented) to see your points and contribution level.

## Deployment

This application is configured for easy deployment on platforms like Vercel. Ensure your environment variables are set in your deployment platform's settings.

**[https://vercel.com/jakebuddy7s-projects/trash-mapper](https://vercel.com/jakebuddy7s-projects/trash-mapper)**