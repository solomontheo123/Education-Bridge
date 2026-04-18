"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Menu, 
  X, 
  User, 
  Home, 
  BookOpen, 
  Info, 
  Mail, 
  ChevronRight,
  Map // Added for a roadmap icon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/context/UserContext";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isComplete, isHydrated } = useUser();

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          
          <Link href="/" className="text-2xl font-bold text-bridge-blue">
            Education Bridge
          </Link>
        </div>

        <div className="flex items-center gap-4">

          {/* HYDRATION-SAFE BUTTON */}
          {!isHydrated ? (
            <div className="hidden sm:flex w-[140px] h-[40px] bg-gray-200 dark:bg-slate-700 rounded-md animate-pulse" />
          ) : (
            <Link
              href={isComplete ? "/roadmap" : "/onboarding"}
              className={`${
                isComplete
                  ? "bg-blue-600 hover:bg-blue-700" // Styled as per your request
                  : "bg-bridge-blue hover:bg-bridge-blue/90" 
              } text-white px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 hidden sm:flex`}
            >
              {isComplete ? (
                <>
                  <BookOpen className="w-4 h-4" /> My Roadmap
                </>
              ) : (
                "Get Started"
              )}
            </Link>
          )}

          <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
            <User className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 z-[70] shadow-2xl p-6 border-r border-gray-200 dark:border-gray-800"
            >
              <div className="flex justify-between items-center mb-10">
                <span className="font-bold text-bridge-blue text-lg">
                  Navigation
                </span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                <SidebarLink href="/" icon={<Home className="w-5 h-5" />} label="Home" close={() => setIsMenuOpen(false)} />
                
                {/* Roadmap link added to Sidebar for easy access */}
                {isComplete && (
                  <SidebarLink href="/roadmap" icon={<Map className="w-5 h-5" />} label="My Roadmap" close={() => setIsMenuOpen(false)} />
                )}

                <SidebarLink href="/courses" icon={<BookOpen className="w-5 h-5" />} label="Courses" close={() => setIsMenuOpen(false)} />
                <SidebarLink href="/about" icon={<Info className="w-5 h-5" />} label="About Us" close={() => setIsMenuOpen(false)} />
                <SidebarLink href="/contact" icon={<Mail className="w-5 h-5" />} label="Contact" close={() => setIsMenuOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  close,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  close: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={close}
      className="flex items-center justify-between p-4 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-gray-700 dark:text-gray-300 group"
    >
      <div className="flex items-center gap-4">
        {icon}
        <span className="font-semibold">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}