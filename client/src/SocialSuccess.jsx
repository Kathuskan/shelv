import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function SocialSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const user = searchParams.get('user');

        if (token && user) {
            // Save to localStorage just like a normal login
            localStorage.setItem('token', token);
            localStorage.setItem('user', user);
            
            // Go to home and force a refresh to update the Navbar
            window.location.href = '/'; 
        } else {
            navigate('/login');
        }
    }, [searchParams, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800">Verifying with Google...</h2>
            <p className="text-gray-500">You'll be redirected in just a moment.</p>
        </div>
    );
}

export default SocialSuccess;