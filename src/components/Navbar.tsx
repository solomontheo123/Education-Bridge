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
  Map,
  LogIn,
  LogOut,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { userEmail, loading, setUserEmail } = useUser();

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;

    localStorage.removeItem("eduBridgeToken");
    localStorage.removeItem("eduBridgeEmail");
    setUserEmail(null);
    router.push('/');
  };

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

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/admissions"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <Map className="w-4 h-4" />
            Admissions
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
            <User className="w-5 h-5 text-gray-400" />
          </div>

          {/* Auth Button */}
          {!loading && (
            userEmail ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )
          )}
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
                <SidebarLink href="/dashboard" icon={<Trophy className="w-5 h-5" />} label="Dashboard" close={() => setIsMenuOpen(false)} />
                <SidebarLink href="/admissions" icon={<Map className="w-5 h-5" />} label="Admissions" close={() => setIsMenuOpen(false)} />
                
                <SidebarLink href="/courses" icon={<BookOpen className="w-5 h-5" />} label="Courses" close={() => setIsMenuOpen(false)} />
                <SidebarLink href="/about" icon={<Info className="w-5 h-5" />} label="About Us" close={() => setIsMenuOpen(false)} />
                <SidebarLink href="/contact" icon={<Mail className="w-5 h-5" />} label="Contact" close={() => setIsMenuOpen(false)} />

                {/* Auth Links */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-6">
                  {!loading && (
                    userEmail ? (
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center justify-between w-full p-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-600 dark:text-red-400 group"
                      >
                        <div className="flex items-center gap-4">
                          <LogOut className="w-5 h-5" />
                          <span className="font-semibold">Logout</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-red-300 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <SidebarLink href="/login" icon={<LogIn className="w-5 h-5" />} label="Login" close={() => setIsMenuOpen(false)} />
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
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