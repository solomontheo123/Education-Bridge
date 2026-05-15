"use client";

import React, { useEffect, useState, useRef } from "react";
import { useUser } from "@/context/UserContext";
import { getCurriculum } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Clock, BookOpen, Download, ArrowLeft, Send, MessageSquare, GraduationCap, Calendar } from "lucide-react";
import Link from "next/link";
import { saveRoadmap } from "@/lib/api";
import ReactMarkdown from 'react-markdown';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface YearData {
  title: string;
  description: string;
  courses: Array<{
    name: string;
    topics: string[];
  }>;
}

interface CurriculumData {
  [key: string]: YearData;
}

export default function CurriculumPage() {
  // ============ AUTHENTICATION ============
  useAuth();

  // ============ STATE MANAGEMENT ============
  const { userData, userEmail } = useUser();
  const [curriculum, setCurriculum] = useState<CurriculumData>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);

  // ============ REFS ============
  const scrollRef = useRef<HTMLDivElement>(null);

  // ============ SAVE CURRICULUM FUNCTION ============
  const saveCurriculumToDB = React.useCallback(async (curriculumData: CurriculumData) => {
    if (!userEmail) return;

    try {
      // Convert curriculum to array format for saving
      const curriculumArray = Object.entries(curriculumData).map(([year, data]) =>
        `${year.toUpperCase()}: ${data.title} - ${data.description}\nCourses: ${data.courses.map(c => c.name).join(', ')}`
      );

      await saveRoadmap({
        education: userData.education,
        interests: userData.interests,
        barriers: userData.barriers,
        custom_roadmap: curriculumArray,
      });
      console.log("Curriculum saved successfully.");
    } catch (error) {
      console.error("Error saving curriculum:", error);
    }
  }, [userData, userEmail]);

  // ============ EFFECTS ============

  // Load curriculum data
  useEffect(() => {
    async function fetchCurriculum() {
      if (userData.interests) {
        try {
          setFetchError(null);
          setLoading(true);
          const result = await getCurriculum(userData);
          if (result?.status === "error") {
            setFetchError(result.message || "Unable to generate curriculum.");
          }

          if (result && result.curriculum) {
            setCurriculum(result.curriculum);

            if (userEmail) {
              await saveCurriculumToDB(result.curriculum);
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Failed to load curriculum:", error);
          setFetchError(
            message.includes("Failed to fetch") || message.includes("Connection refused")
              ? "Cannot connect to the curriculum backend on port 9000. Start the Python backend with `npm run backend` or `uvicorn main:app --reload` and refresh."
              : message
          );
        } finally {
          setLoading(false);
        }
      }
    }
    fetchCurriculum();
  }, [userData, saveCurriculumToDB, userEmail]);

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('curriculum-chat');
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
      localStorage.setItem('curriculum-chat', JSON.stringify(messages));
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

      const response = await fetch("http://127.0.0.1:9000/chat", {
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
  if (!loading && fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-xl rounded-3xl border border-red-200 bg-red-50 p-8 dark:border-red-700 dark:bg-red-900/50">
          <h2 className="text-2xl font-bold mb-4 text-red-700 dark:text-red-200">Could not generate your curriculum</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{fetchError}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!loading && (!userData.interests || Object.keys(curriculum).length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">No Curriculum Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please complete the onboarding process to generate your personalized curriculum.
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
            Bridge AI is crafting your personalized curriculum...
          </p>
        </div>
      </div>
    );
  }

  // ============ MAIN RENDER ============
  return (
    <div className="max-w-6xl mx-auto p-6 pb-24 bg-white dark:bg-gray-900 rounded-3xl shadow-lg mt-5">
      {/* HEADER - Personalized Curriculum */}
      <header className="mb-12 text-center pt-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-4 inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
            🎓 {userData.education} • Learning {userData.interests}
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Your 5-Year Curriculum
          </h1>

          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed text-lg">
            Comprehensive curriculum for <span className="font-bold text-blue-600">{userData.interests}</span> at
            <span className="font-bold text-blue-600"> {userData.education}</span> level.
            Designed to help you overcome: <span className="italic text-blue-600">{userData.barriers}</span>
          </p>

          {/* Logout Button */}
          <div className="mt-6">
            <button
              onClick={() => {
                localStorage.removeItem("eduBridgeToken");
                localStorage.removeItem("eduBridgeEmail");
                window.location.href = "/login";
              }}
              className="bg-red-500 text-white px-4 py-2 rounded-lg no-print hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
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
          🤖 Generated by Bridge AI
        </h3>
        <p className="text-gray-700 dark:text-gray-300">
          Your AI remembers: <strong>{userData.education}</strong> background,
          <strong> {userData.interests}</strong> focus, and overcoming
          <strong> {userData.barriers}</strong>. Use the chat bubble (bottom right) for personalized guidance! 🎓
        </p>
      </motion.div>

      {/* CURRICULUM TIMELINE */}
      <div className="relative space-y-8 mb-16">
        {/* Timeline Line */}
        <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-300 via-indigo-300 to-purple-300 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-600 rounded-full"></div>

        {Object.entries(curriculum).map(([yearKey, yearData], index) => (
          <motion.div
            key={yearKey}
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
              <div className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center font-bold text-xl border-4 border-white dark:border-gray-900 ${
                index === 0
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
              }`}>
                <GraduationCap size={24} />
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-900 px-2 py-1 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                Year {index + 1}
              </div>
            </div>

            {/* Year Card */}
            <div className={`md:w-[calc(50%-2rem)] ${
              index % 2 === 0 ? "md:mr-auto md:text-right md:pr-8" : "md:ml-auto md:text-left md:pl-8"
            }`}>
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.2 }}
                className={`p-8 rounded-2xl border-2 shadow-md hover:shadow-xl transition-all duration-300 ${
                  index === 0
                    ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-700'
                    : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700'
                }`}
              >
                {/* Year Header */}
                <div className={`flex items-center gap-3 mb-4 ${
                  index % 2 === 0 ? "md:justify-end" : "md:justify-start"
                }`}>
                  <Calendar className={`w-6 h-6 ${
                    index === 0 ? 'text-green-600' : 'text-blue-600'
                  }`} />
                  <h3 className={`text-xl font-bold ${
                    index === 0 ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {yearData.title}
                    {index === 0 && (
                      <span className="ml-2 text-sm font-normal text-green-600">
                        (Current Year)
                      </span>
                    )}
                  </h3>
                </div>

                {/* Year Description */}
                <p className="text-gray-800 dark:text-gray-100 leading-relaxed mb-6 text-base">
                  {yearData.description}
                </p>

                {/* Courses */}
                <div className="mb-6">
                  <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
                    index % 2 === 0 ? "md:justify-end" : "md:justify-start"
                  }`}>
                    <BookOpen size={16} className="text-blue-600" />
                    Courses ({yearData.courses?.length || 0})
                  </h4>
                  <div className={`space-y-4 ${
                    index % 2 === 0 ? "md:text-right" : "md:text-left"
                  }`}>
                    {yearData.courses?.map((course, courseIndex) => (
                      <div
                        key={courseIndex}
                        className={`p-4 rounded-lg border ${
                          index === 0
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        <h5 className={`font-semibold mb-2 ${
                          index === 0 ? 'text-green-800 dark:text-green-200' : 'text-blue-800 dark:text-blue-200'
                        }`}>
                          {course.name}
                        </h5>
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Topics:</p>
                          <div className="flex flex-wrap gap-1">
                            {course.topics.map((topic, topicIndex) => (
                              <span
                                key={topicIndex}
                                className={`inline-block px-2 py-1 text-xs rounded-full ${
                                  index === 0
                                    ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                                    : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                                }`}
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Year Meta Tags */}
                <div className={`flex flex-wrap gap-3 ${
                  index % 2 === 0 ? "md:justify-end" : "md:justify-start"
                }`}>
                  <span className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
                    index === 0
                      ? 'text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30'
                      : 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30'
                  }`}>
                    <Clock size={14} />
                    {index === 0 ? 'Available Now' : 'Sequential Access'}
                  </span>
                  <span className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
                    index === 0
                      ? 'text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30'
                      : 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30'
                  }`}>
                    <BookOpen size={14} />
                    {yearData.courses?.length || 0} Courses
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
                <h3 className="font-bold text-lg">🤖 Bridge AI Mentor</h3>
                <p className="text-blue-100 text-xs">
                  Personalized guidance for your {userData.interests} curriculum
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
                    Hi! 👋 I&apos;m your Bridge AI mentor.
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                    Ask me anything about your {userData.interests} curriculum!
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
                      {msg.role === "user" ? (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
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