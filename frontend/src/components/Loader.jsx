import React from "react";
import { Loader2 } from "lucide-react";

export default function Loader({ text = "Loading..." }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-softBg/60 backdrop-blur-xs gap-3 p-4 animate-fadeIn">
      <div className="relative flex items-center justify-center">
        {/* Subtle glowing background pulse */}
        <div className="absolute w-12 h-12 rounded-full bg-primary/20 animate-ping" />
        {/* Modern animated spinner */}
        <Loader2 className="w-9 h-9 animate-spin text-primary relative z-10" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 animate-pulse">
        {text}
      </p>
    </div>
  );
}
