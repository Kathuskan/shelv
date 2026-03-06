import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import BookCard from './BookCard';

function Profile() {
  const [savedBooks, setSavedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Grab the user data and token directly from the browser's memory
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Kick them out if they aren't logged in
    if (!token || !user) {
      navigate('/login');
      return;
    }

    const fetchSavedBooks = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/user/saved-books', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedBooks(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching saved books:", error);
        setLoading(false);
      }
    };

    fetchSavedBooks();
  }, [token, user, navigate]);

  if (!user) return null;

  // Generate a sleek monogram avatar from their name (e.g., "Kathuskan Thavarajah" -> "KT")
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* --- PROFILE HEADER CARD --- */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row items-center p-8 gap-8">
        
        {/* Avatar */}
        <div className="h-32 w-32 bg-indigo-600 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-lg border-4 border-indigo-50 flex-shrink-0">
          {initials}
        </div>

        {/* User Info */}
        <div className="flex-grow text-center md:text-left">
          <h1 className="text-3xl font-black text-gray-900">{user.name}</h1>
          <p className="text-gray-500 font-medium mb-4">{user.email}</p>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <span className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide">
              {user.role === 'admin' ? 'Admin' : 'Member'}
            </span>
            
            {user.sellerStatus === 'approved' && (
              <span className="bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide">
                Verified Seller
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons based on Role */}
        <div className="flex flex-col gap-3 w-full md:w-auto">
          {user.sellerStatus === 'approved' || user.role === 'admin' ? (
            <Link to="/my-listings" className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold transition-colors text-center shadow-md">
              Manage My Listings
            </Link>
          ) : user.sellerStatus === 'pending' ? (
            <span className="bg-amber-100 text-amber-800 px-6 py-3 rounded-xl font-bold text-center border border-amber-200">
              Seller Application Pending
            </span>
          ) : (
            <Link to="/apply-seller" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors text-center shadow-md shadow-indigo-200">
              Become a Seller
            </Link>
          )}
        </div>
      </div>

      {/* --- SAVED BOOKS SECTION --- */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2 flex items-center gap-2">
          <span>❤️</span> My Saved Books
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : savedBooks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No saved books yet!</h3>
            <p className="text-gray-500 mb-6">Keep track of the textbooks you need by saving them for later.</p>
            <Link to="/" className="text-indigo-600 font-bold hover:underline">
              Browse Marketplace &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {savedBooks.map(book => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Profile;