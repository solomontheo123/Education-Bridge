"use client";

import React, { useEffect, useState, useRef } from "react";
import { useUser } from "@/context/UserContext";
import { getRoadmap } from "@/lib/api";
import { motion } from "framer-motion";
import { Clock, BookOpen, Download, ArrowLeft, Send, MessageSquare } from "lucide-react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function RoadmapPage() {
  // ============ STATE MANAGEMENT ============
  const { userData } = useUser();
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);

  // ============ REFS ============
  const scrollRef = useRef<HTMLDivElement>(null);

  // ============ EFFECTS ============

  // Load roadmap data
  useEffect(() => {
    async function fetchAIResult() {
      if (userData.interests) {
        try {
          const result = await getRoadmap(userData);
          if (result && result.custom_roadmap) {
            setRoadmap(result.custom_roadmap);
          }
        } catch (error) {
          console.error("Failed to load roadmap:", error);
        }
      }
      setLoading(false);
    }
    fetchAIResult();
  }, [userData]);

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('roadmap-chat');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('roadmap-chat', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ============ UTILITY FUNCTIONS ============

  // ============ CHAT HANDLER ============
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!chatInput.trim() || isChatLoading) return;

    // Rate limiting (1 second cooldown)
    const now = Date.now();
    if (now - lastMessageTime < 1000) return;
    setLastMessageTime(now);

    const userMsg: Message = {
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add user message immediately to UI
    setMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput("");
    setIsChatLoading(true);

    try {
      // Sanitize history: remove timestamp before sending to API
      const cleanHistory = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          context: userData,
          history: cleanHistory
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.reply) {
        const assistantMsg: Message = {
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error("No response received from AI mentor");
      }

    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please check your internet connection and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ============ KEYBOARD HANDLER ============
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============ ERROR STATE ============
  if (!loading && (!userData.interests || roadmap.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">No Roadmap Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please complete the onboarding process to generate your personalized learning path.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <ArrowLeft size={18} />
            Go to Onboarding
          </Link>
        </div>
      </div>
    );
  }

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4 mx-auto"
          />
          <p className="text-gray-600 dark:text-gray-300 animate-pulse">
            AI Mentor is crafting your personalized roadmap...
          </p>
        </div>
      </div>
    );
  }

  // ============ MAIN RENDER ============
  return (
    <div className="max-w-4xl mx-auto p-6 pb-24 bg-white dark:bg-gray-900 rounded-3xl shadow-lg mt-5">
      {/* HEADER - Personalized Learning */}
      <header className="mb-12 text-center pt-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-4 inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
            📚 {userData.education} • Learning {userData.interests}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Your Personal Growth Path
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed text-lg">
            Customized roadmap for <span className="font-bold text-blue-600">{userData.interests}</span> at 
            <span className="font-bold text-blue-600"> {userData.education}</span> level. 
            Designed to help you overcome: <span className="italic text-blue-600">{userData.barriers}</span>
          </p>
        </motion.div>
      </header>

      {/* CONTEXTUAL LEARNING INFO */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800"
      >
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
          💡 Personalized Just for You
        </h3>
        <p className="text-gray-700 dark:text-gray-300">
          Your AI remembers: <strong>{userData.education}</strong> background, 
          <strong> {userData.interests}</strong> focus, and overcoming 
          <strong> {userData.barriers}</strong>. Use the chat bubble (bottom right) for personalized guidance! 🤖
        </p>
      </motion.div>

      {/* ROADMAP TIMELINE */}
      <div className="relative space-y-12 mb-16">
        {/* Timeline Line */}
        <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-blue-300 via-indigo-300 to-purple-300 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-600"></div>

        {roadmap.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15, duration: 0.5 }}
            className={`relative flex items-center gap-6 md:gap-0 ${
              index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
            }`}
          >
            {/* Timeline Dot */}
            <div className="relative z-10 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg flex items-center justify-center font-bold text-lg border-4 border-white dark:border-gray-900">
                {index + 1}
              </div>
            </div>

            {/* Step Card */}
            <div className={`md:w-[calc(50%-1rem)] ${
              index % 2 === 0 ? "md:mr-auto md:text-right md:pr-8" : "md:ml-auto md:text-left md:pl-8"
            }`}>
              <motion.div 
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.2 }}
                className="p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-xl transition-all duration-300"
              >
                <p className="text-gray-800 dark:text-gray-100 leading-relaxed mb-4 text-base">
                  {step}
                </p>

                {/* Step Meta Tags */}
                <div className={`flex flex-wrap gap-3 ${
                  index % 2 === 0 ? "md:justify-end" : "md:justify-start"
                }`}>
                  <span className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                    <Clock size={14} /> Flexible Pace
                  </span>
                  <span className="flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full">
                    <BookOpen size={14} /> Free Resources
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ACTION BUTTONS */}
      <footer className="flex flex-col sm:flex-row gap-4 items-center justify-center no-print">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-8 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-full font-bold hover:scale-105 transition-transform shadow-lg"
        >
          <Download size={18} /> Save as PDF
        </button>
        
        <Link href="/onboarding" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft size={16} /> Start Over
        </Link>
      </footer>

      {/* ============ FLOATING CHAT BUBBLE ============ */}
      <div className="fixed bottom-6 right-6 z-50 no-print">
        {/* Chat Toggle Button */}
        {!isChatOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(true)}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:shadow-3xl transition-all duration-300"
            aria-label="Open AI Mentor Chat"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <MessageSquare size={24} />
            </motion.div>
          </motion.button>
        )}

        {/* Chat Window */}
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="sticky bottom-16 right-0 w-96 max-h-[600px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <h3 className="font-bold text-lg">🤖 AI Mentor</h3>
                <p className="text-blue-100 text-xs">
                  Personalized guidance for your {userData.interests} journey
                </p>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Messages Container */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                    Hi! 👋 I&apos;m your AI mentor.
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                    Ask me anything about your {userData.interests} roadmap!
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white rounded-br-none"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      {msg.timestamp && (
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}

              {/* Loading Indicator */}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl bg-gray-200 dark:bg-gray-700 rounded-bl-none">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-3xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask your mentor..."
                  disabled={isChatLoading}
                  className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 disabled:opacity-50 transition"
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
