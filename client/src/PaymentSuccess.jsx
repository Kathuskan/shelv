import { Link } from 'react-router-dom';
import { useEffect } from 'react';

function PaymentSuccess() {
  // Scroll to top when the page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 py-12">
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md w-full animate-fade-in">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <span className="text-5xl">🎉</span>
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Payment Successful!</h1>
        
        <p className="text-gray-500 mb-8 leading-relaxed">
          Thank you for your order. Your payment has been securely processed by Stripe. The seller has been notified and will prepare your book!
        </p>
        
        <Link 
          to="/" 
          className="w-full inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 active:scale-95"
        >
          Back to Marketplace &rarr;
        </Link>
      </div>
    </div>
  );
}

export default PaymentSuccess;