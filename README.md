This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Education Bridge 🎓

**Education Bridge** is a modern, AI-ready learning platform designed to help students navigate their educational journey. It features a personalized onboarding experience that builds a custom roadmap based on individual goals and barriers.

## 🚀 Features

* **Intelligent Onboarding**: A multi-step form that captures user education level, interests, and learning barriers.
* **Dynamic UI Logic**: The navigation intelligently shifts from a "Get Started" call-to-action to a personalized "My Roadmap" dashboard once onboarding is complete.
* **Persistent State**: Uses React Context API and LocalStorage to ensure user data persists across browser refreshes without requiring a database (yet!).
* **Responsive Side-Drawer**: A custom-built navigation sidebar powered by **Framer Motion** for smooth, mobile-friendly transitions.
* **Dark Mode Support**: Fully themed for both light and dark environments using Tailwind CSS.

## 🛠️ Tech Stack

* **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Animations**: [Framer Motion](https://www.framer.com/motion/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **State Management**: React Context API
* **Type Safety**: TypeScript & Zod (Schema validation)

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/education-bridge.git](https://github.com/YOUR_USERNAME/education-bridge.git)
   cd education-bridge
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.template .env.local
   # Edit .env.local with your actual values
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

5. **Set up the database:**
   - Create a PostgreSQL database
   - Update `DATABASE_URL` in `.env.local`

6. **Run database migrations:**
   ```bash
   # The app will automatically create tables on startup
   npm run backend
   ```

7. **Start the development servers:**
   ```bash
   # Option 1: Run both frontend and backend
   npm run both

   # Option 2: Run separately
   npm run dev          # Frontend on http://localhost:3000
   npm run backend      # Backend on http://localhost:9000
   ```

8. **Open the app:**
   Navigate to http://localhost:3000 to see the project in action.

🏗️ Project Structure
/src/app: Next.js pages and layouts.

/src/components: Reusable UI elements (Navbar, Sidebar, etc.).

/src/context: Global state management logic.

/src/lib: Validation schemas and utility functions.