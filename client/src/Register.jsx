import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    profilePicture: '' // 🌟 NEW
  });

  const [wantToSell, setWantToSell] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🌟 NEW: Convert image to Base64 string instantly
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setFormData({ ...formData, profilePicture: reader.result });
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return; 
    }

    // 2. Validate Password 
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError("Password must be at least 8 characters long and include at least one letter and one number.");
      setLoading(false);
      return;
    }

    try {
      await axios.post('http://localhost:5001/api/auth/register', formData);

      const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
        email: formData.email,
        password: formData.password
      });

      localStorage.setItem('token', loginRes.data.token);
      localStorage.setItem('user', JSON.stringify(loginRes.data.user));

      if (wantToSell) {
        window.location.href = '/apply-seller';
      } else {
        window.location.href = '/';
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 mb-20 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Join Shelv</h2>
          <p className="text-gray-500 mt-2">Create an account to start browsing and buying.</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold text-center border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 🌟 NEW: Profile Picture Upload */}
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="h-24 w-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center mb-3 relative group">
              {formData.profilePicture ? (
                <img src={formData.profilePicture} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-gray-400 text-3xl">📷</span>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" title="Upload Profile Picture" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Add Profile Picture (Optional)</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
            {/* 🌟 NEW: Password Hint */}
            <p className="text-xs text-gray-500 mt-2 font-medium">Must be at least 8 characters with 1 letter and 1 number.</p>
          </div>

          <div
            onClick={() => setWantToSell(!wantToSell)}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-between ${wantToSell ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
          >
            <div>
              <p className={`font-bold ${wantToSell ? 'text-indigo-900' : 'text-gray-700'}`}>I want to sell books</p>
              <p className={`text-xs mt-1 ${wantToSell ? 'text-indigo-600' : 'text-gray-500'}`}>We will verify your phone number next.</p>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${wantToSell ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white'}`}>
              {wantToSell && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5">
            {loading ? 'Creating Account...' : (wantToSell ? 'Continue to Verification \u2192' : 'Create Account')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600 font-medium">
          Already have an account? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;