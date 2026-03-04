import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ApplySeller() {
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState(''); // <-- ADD THIS LINE
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(''); // Clear old errors

        // --- NEW: PHONE VALIDATION ---
        // Removes spaces and checks if it's exactly 10 digits starting with 0
        const cleanPhone = phone.replace(/\s+/g, '');
        const phoneRegex = /^0\d{9}$/;

        if (!phoneRegex.test(cleanPhone)) {
            setError("Please enter a valid 10-digit mobile number (e.g., 0771234567).");
            setLoading(false);
            return;
        }
        // -----------------------------

        try {
            await axios.post('http://localhost:5001/api/auth/send-otp', { phone: cleanPhone }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStep(2);
            setLoading(false);
        } catch (error) {
            setError("Failed to send verification code.");
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:5001/api/auth/verify-otp', { code }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("Success! You are now an approved seller.");

            // Update the local storage with the new 'seller' role
            localStorage.setItem('user', JSON.stringify(response.data.updatedUser));

            // Force reload the page so the Navbar updates, then send to dashboard
            window.location.href = '/my-listings';
        } catch (error) {
            alert(error.response?.data?.message || "Invalid Code.");
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 px-4">
            <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Become a Seller</h2>
                    <p className="text-gray-500">Verify your mobile number to instantly activate your storefront.</p>
                </div>
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold text-center border border-red-100">
                        {error}
                    </div>
                )}
                {step === 1 ? (
                    <form onSubmit={handleSendOTP} className="space-y-6">

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Mobile Number</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="07X XXX XXXX"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-colors">
                            {loading ? "Sending..." : "Send Verification Code"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm mb-6 text-center">
                            Code sent to <strong>{phone}</strong>.<br />
                            <span className="text-xs text-indigo-600 font-bold">(Check your backend terminal!)</span>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Enter 6-Digit Code</label>
                            <input
                                type="text"
                                required
                                maxLength="6"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="------"
                                className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors shadow-md">
                            {loading ? "Verifying..." : "Verify & Activate Account"}
                        </button>
                        <button type="button" onClick={() => setStep(1)} className="w-full text-center text-sm font-bold text-gray-500 hover:text-gray-800 mt-4">
                            Wrong number? Go back.
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default ApplySeller;