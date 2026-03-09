import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ApplySeller() {
    const [step, setStep] = useState(1);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // 🌟 Cooldown Timer State
    const [timer, setTimer] = useState(0);

    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Handle the countdown logic
    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSendEmailOTP = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.post('http://localhost:5001/api/auth/send-otp', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStep(2);
            setTimer(60); // Start 60-second cooldown
            setLoading(false);
        } catch (error) {
            setError("Failed to send verification email. Please try again.");
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('http://localhost:5001/api/auth/verify-otp', { code }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("Success! Your seller account is now active.");
            localStorage.setItem('user', JSON.stringify(response.data.updatedUser));
            window.location.href = '/my-listings';
        } catch (error) {
            setError(error.response?.data?.message || "Invalid or expired code.");
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 px-4">
            <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Seller Verification</h2>
                    <p className="text-gray-500 italic">"Security is a process, not a product."</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold text-center border border-red-100">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <div className="space-y-6 text-center">
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                            <p className="text-sm text-indigo-900 font-medium">
                                We will send a 6-digit code to your registered email:
                            </p>
                            <p className="font-bold text-indigo-600 mt-1">{user?.email}</p>
                        </div>
                        
                        <button 
                            onClick={handleSendEmailOTP} 
                            disabled={loading} 
                            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95"
                        >
                            {loading ? "Sending..." : "Send Verification Email"}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm mb-6 text-center">
                            A verification code has been sent to <br/>
                            <strong className="text-indigo-900">{user?.email}</strong>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Enter 6-Digit Code</label>
                            <input
                                type="text"
                                required
                                maxLength="6"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="000000"
                                className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-95"
                        >
                            {loading ? "Verifying..." : "Verify & Activate"}
                        </button>

                        <div className="text-center mt-4">
                            <button 
                                type="button" 
                                onClick={handleSendEmailOTP} 
                                disabled={timer > 0 || loading}
                                className={`text-sm font-bold transition-colors ${timer > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'}`}
                            >
                                {timer > 0 ? `Resend code in ${timer}s` : "Didn't get the code? Resend"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default ApplySeller;