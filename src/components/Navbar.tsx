"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, User, Mail, Settings } from "lucide-react";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold text-bridge-blue dark:text-bridge-blue">
            Education Bridge
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            className="text-gray-700 dark:text-gray-300 hover:text-bridge-blue dark:hover:text-bridge-blue transition-colors duration-300 font-medium"
          >
            Home
          </Link>
          <Link
            href="/courses"
            className="text-gray-700 dark:text-gray-300 hover:text-bridge-blue dark:hover:text-bridge-blue transition-colors duration-300 font-medium"
          >
            Courses
          </Link>
          <Link
            href="/about"
            className="text-gray-700 dark:text-gray-300 hover:text-bridge-blue dark:hover:text-bridge-blue transition-colors duration-300 font-medium"
          >
            About
          </Link>
        </div>

        {/* Right Side - Sign In Button & Profile Dropdown */}
        <div className="flex items-center gap-4">
          <button className="bg-bridge-blue hover:bg-bridge-blue/90 text-white px-6 py-2 rounded-md font-medium transition-colors duration-300 hidden md:block">
            Sign In
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-300 text-gray-700 dark:text-gray-300"
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Profile</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <Link
                  href="/contact"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-300 border-b border-gray-200 dark:border-gray-700"
                >
                  <Mail className="w-4 h-4" />
                  <span>Contact Us</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-300"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 dark:text-gray-300 hover:text-bridge-blue transition-colors duration-300"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4">
            <Link
              href="/"
              className="text-gray-700 dark:text-gray-300 hover:text-bridge-blue dark:hover:text-bridge-blue transition-colors duration-300 font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/courses"
              className="text-gray-700 dark:text-gray-300 hover:text-bridge-blue dark:hover:text-bridge-blue transition-colors duration-300 font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Courses
            </Link>
            <Link
              href="/about"
              className="text-gray-700 dark:text-gray-300 hover:text-bridge-blue dark:hover:text-bridge-blue transition-colors duration-300 font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button className="w-full bg-bridge-blue hover:bg-bridge-blue/90 text-white px-6 py-2 rounded-md font-medium transition-colors duration-300">
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
        