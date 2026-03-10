import { useState } from 'react';
// 🌟 NEW: Import your custom axios instance
import axios from './api/axios'; 
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  // 🌟 NEW: We grab the live URL (if hosted) or fall back to localhost
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 🌟 REMOVED LOCALHOST
      const response = await axios.post('/api/auth/login', formData);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      window.location.href = '/'; 

    } catch (error) {
      console.error("Login error:", error);
      alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Welcome back</h2>
          <p className="text-gray-500 mt-2 text-sm">Please sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors duration-300 shadow-lg shadow-indigo-200"
          >
            Sign In
          </button>
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* 🌟 FIXED: Dynamically injects the correct backend URL for Google OAuth */}
          <a
            href={`${backendUrl}/api/auth/google`}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-3.5 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-[0.98]"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continue with Google
          </a>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-indigo-600 font-bold hover:underline">
            Create one now
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Login;