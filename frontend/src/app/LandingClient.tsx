'use client'

import { motion, type Variants } from 'framer-motion'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export function LandingClient() {
  const authUrl = `${process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:8000'}/auth/google`

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-hidden bg-[#0c0b0a]">
      {/* Ambient background glow */}
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #b8832012 0%, transparent 70%)' }}
      />

      {/* Main hero section */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col items-center justify-center z-10 w-full"
      >
        <motion.h1 
          variants={itemVariants}
          className="font-fraunces font-semibold tracking-[-0.03em] text-[#f5f0e8] mb-1 leading-tight text-center" 
          style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}
        >
          Notebook<span className="text-amber">LM</span>
        </motion.h1>
        
        <motion.p 
          variants={itemVariants}
          className="font-mono text-[12px] text-muted lowercase mb-8"
        >
          "your ai research companion"
        </motion.p>
        
        <motion.div variants={itemVariants}>
          <a
            href={authUrl}
            className="flex items-center gap-3 bg-[#f5f0e8] hover:bg-[#ede8e0] text-[#0c0b0a]
                       font-inter font-medium text-sm px-6 h-[44px] rounded-[10px]
                       transition-all duration-150 hover:scale-[1.02] active:scale-[0.99]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M9 0a9 9 0 100 18A9 9 0 009 0z" fill="#EA4335"/>
              <path d="M9 0v9h9A9 9 0 009 0z" fill="#FBBC05"/>
              <path d="M18 9H9v9a9 9 0 009-9z" fill="#34A853"/>
              <path d="M9 9H0a9 9 0 009 9V9z" fill="#4285F4"/>
              <circle cx="9" cy="9" r="3.5" fill="white"/>
            </svg>
            Continue with Google
          </a>
        </motion.div>
      </motion.div>

      {/* Footer strip */}
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="pb-8 flex flex-col items-center gap-4 z-10"
      >
        <div className="inline-flex gap-3 items-center justify-center">
          <span className="bg-surface border border-border rounded-full px-3 py-1 font-mono text-[10px] text-muted">AI summaries</span>
          <span className="bg-surface border border-border rounded-full px-3 py-1 font-mono text-[10px] text-muted">mind maps</span>
          <span className="bg-surface border border-border rounded-full px-3 py-1 font-mono text-[10px] text-muted">study guides</span>
        </div>
        <div className="font-mono text-[9px] text-[#2a2825]">
          Built with LangChain + DeepSeek
        </div>
      </motion.div>
    </div>
  )
}
