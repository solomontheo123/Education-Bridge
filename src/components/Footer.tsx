"use client";

import Link from "next/link";
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram,FaGithub, FaEnvelope } from "react-icons/fa";

export default function Footer() { 
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 dark:bg-black text-gray-300 dark:text-gray-400">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1">
            <div className="text-2xl font-bold text-bridge-blue mb-4">
              Education Bridge
            </div>
            <p className="text-sm text-gray-400">
              Bridging the gap between education and opportunity for students worldwide.
            </p>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-bridge-blue transition-colors duration-300">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-bridge-blue transition-colors duration-300">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-bridge-blue transition-colors duration-300">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-1">
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="hover:text-bridge-blue transition-colors duration-300">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-bridge-blue transition-colors duration-300">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-bridge-blue transition-colors duration-300">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="col-span-1">
            <h4 className="text-white font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-bridge-blue transition-colors duration-300"
              >
                <FaFacebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-bridge-blue transition-colors duration-300"
              >
                <FaTwitter className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-bridge-blue transition-colors duration-300"
              >
                <FaLinkedin className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-bridge-blue transition-colors duration-300"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-bridge-blue transition-colors duration-300"
              >
                <FaGithub className="w-5 h-5" />
              </a>
              <a
                href="mailto:support@educationbridge.com"
                className="p-2 bg-gray-800 rounded-lg hover:bg-bridge-blue transition-colors duration-300"
              >
                <FaEnvelope className="w-5 h-5" />
              </a>

            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          {/* Newsletter Signup */}
          <div className="mb-8 p-6 bg-gray-800 rounded-lg">
            <h4 className="text-white font-semibold mb-4">Subscribe to Our Newsletter</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-bridge-blue border border-gray-600"
              />
              <button className="px-6 py-2 bg-bridge-blue text-white rounded-lg hover:bg-bridge-blue/90 transition-colors duration-300 font-medium">
                Subscribe
              </button>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <p>
              &copy; {currentYear} Education Bridge. All rights reserved.
            </p>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <FaEnvelope className="w-4 h-4" />
              <a href="mailto:support@educationbridge.com" className="hover:text-bridge-blue transition-colors duration-300">
                support@educationbridge.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}