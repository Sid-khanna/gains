# Gains – Gym & Diet Tracker

A full-stack fitness tracking app for logging workouts, tracking diet, and monitoring progress over time.

👉 **Live Demo:** https://gains-one.vercel.app/  
👉 **Repository:** https://github.com/Sid-khanna/GymApp-Gains

---

## Overview

Gains is a personal fitness tracking app designed to replace spreadsheets and manual tracking with a structured, interactive system.

It allows users to:
- Log workouts with sets, reps, and weights  
- Track diet and macros  
- Monitor progress over time  

The focus of this project was building a clean full-stack system that handles real user data, supports flexible inputs, and provides meaningful insights.

---

## Features

- Workout logging with dynamic sets (not fixed formats)  
- Exercise tracking with muscle group categorization  
- Diet tracking with daily and weekly summaries  
- Macro tracking (calories, protein, carbs, fats)  
- Weekly and monthly aggregation of data  
- Historical tracking of workouts and performance  
- Clean and responsive UI  

---

## Tech Stack

**Frontend**
- Next.js (App Router)
- TypeScript
- Tailwind CSS

**Backend / Database**
- Supabase (PostgreSQL)
- Row-based data storage for workouts and diet

**Deployment**
- Vercel

---

## How It Works

### Workout Tracking
- Users log exercises per day  
- Each exercise supports variable sets (different weights/reps)  
- Previous entries are stored and can be referenced  

### Diet Tracking
- Daily intake is logged and stored  
- Weekly averages are calculated (Mon–Sun)  
- Monthly summaries provide longer-term trends  

### Progress Tracking
- Tracks performance over time  
- Enables visualization of strength and consistency trends  

---

## Data Model (Simplified)

```
workout_entries
- id
- date
- exercise_name
- muscle_group
- sets_data (array of sets)

diet_entries
- date
- calories
- protein
- carbs
- fats

exercises
- name
- muscle_group
```

---

## Example Use Cases

- Replacing manual Excel tracking  
- Monitoring strength progression  
- Tracking calorie and macro intake  
- Maintaining consistency in training  

---

## Future Improvements

- Progress charts and visual analytics  
- User authentication and profiles  
- Goal setting (weight, strength, calories)  
- Exercise recommendations  
- Mobile-first UI improvements  

---

## Running Locally

1. Clone the repository:
```bash
git clone https://github.com/Sid-khanna/GymApp-Gains.git
cd GymApp-Gains
```

2. Install dependencies:
```bash
npm install
```

3. Add environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

4. Run the development server:
```bash
npm run dev
```

---

## Why I Built This

I was tracking workouts and diet manually and found it inefficient and inconsistent.

I built Gains to:
- create a structured system for tracking fitness  
- understand trends in training and diet  
- build a real full-stack app with persistent data and user workflows  

---

## Author

Siddharth Khanna  
Automation Developer | Robotics | AI Systems  
