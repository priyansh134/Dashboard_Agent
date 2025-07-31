import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

const textArray = ["Welcome to Super AI.", "I'm your AI assistant.", "Let's get started!"];

const LandingPages = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showGoogleLogin, setShowGoogleLogin] = useState(false);
  const navigate = useNavigate();
  const textareaRef = useRef(null);

  const handleLoginSuccess = (credentialResponse) => {
    console.log(credentialResponse);
    setIsLoggedIn(true);
    // Navigate to the chat page after successful login
    navigate('/recommendations');
  };

  const handleLoginFailure = () => {
    console.log('Login Failed');
  };

  useEffect(() => {
    if (currentIndex < textArray.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 2000); // Wait for 2 seconds before showing the next word
      return () => clearTimeout(timer);
    } else {
      // Show the Google login button after the last text is displayed
      const timer = setTimeout(() => {
        setShowGoogleLogin(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  return (
    <main className="min-h-screen w-full bg-white relative overflow-hidden flex flex-col items-center justify-center">

      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-xl"
      >
        <svg viewBox="0 0 100 40" className="w-16 h-16">
          <motion.path
            d="M0,20 C25,40 50,0 75,20 C100,40 125,0 150,20"
            stroke="url(#gradient)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B6B" />
              <stop offset="50%" stopColor="#9B6BFF" />
              <stop offset="100%" stopColor="#4ECDC4" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Animated text */}
      <div className="h-20 mb-32 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.h1
            key={currentIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-4xl  font-light absolute"
            style={{
              background: "linear-gradient(90deg, #B85B8F 0%, #9B6BFF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {textArray[currentIndex]}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* Animated wave */}
      <motion.div
        className="absolute bottom-0 w-full h-64"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <svg className="w-full h-full" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <motion.path
            d="M0,100 C300,150 450,50 600,100 C750,150 900,50 1200,100 L1200,200 L0,200 Z"
            fill="url(#wave-gradient)"
            initial={{ d: "M0,100 C300,150 450,50 600,100 C750,150 900,50 1200,100 L1200,200 L0,200 Z" }}
            animate={{
              d: [
                "M0,100 C300,150 450,50 600,100 C750,150 900,50 1200,100 L1200,200 L0,200 Z",
                "M0,100 C300,50 450,150 600,100 C750,50 900,150 1200,100 L1200,200 L0,200 Z",
                "M0,100 C300,150 450,50 600,100 C750,150 900,50 1200,100 L1200,200 L0,200 Z",
              ],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(184, 91, 143, 0.2)" />
              <stop offset="50%" stopColor="rgba(155, 107, 255, 0.2)" />
              <stop offset="100%" stopColor="rgba(184, 91, 143, 0.2)" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
      <AnimatePresence>
        {!isLoggedIn && showGoogleLogin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onFailure={handleLoginFailure}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default LandingPages;

