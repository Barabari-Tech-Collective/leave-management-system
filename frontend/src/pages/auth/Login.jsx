import { useEffect } from "react";

export default function Login() {

  const handleGoogleLogin = () => {
    window.open("https://leave-management-system-5m02.onrender.com/auth/google", "_self");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-white to-accent/20">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md text-center space-y-6">

        <h2 className="text-2xl font-bold">
          Login to Leave System
        </h2>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-red-500 text-white py-3 rounded-xl hover:scale-[1.02] transition"
        >
          Continue with Google 🚀
        </button>

      </div>
    </div>
  );
}