import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import BookCard from './BookCard';

function Profile() {
  const [savedBooks, setSavedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', profilePicture: '' });
  const [updateLoading, setUpdateLoading] = useState(false);

  const navigate = useNavigate();
  // Initialize user from localStorage
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }

    // Set initial edit data
    setEditData({ name: user.name, profilePicture: user.profilePicture || '' });

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
  }, [token, navigate, user.name, user.profilePicture]);

  if (!user) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => setEditData({ ...editData, profilePicture: reader.result });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      const res = await axios.put('http://localhost:5001/api/user/profile', editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update LocalStorage and State
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      setIsEditing(false);
      setUpdateLoading(false);
      
      // 🌟 Trigger a refresh to update Navbar avatar immediately
      window.location.reload(); 
    } catch (err) {
      console.error("Failed to update profile", err);
      alert("Failed to update profile. Your image might be too large.");
      setUpdateLoading(false);
    }
  };

  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-8">
        
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="h-32 w-32 rounded-full bg-gray-100 border-4 border-indigo-100 overflow-hidden flex items-center justify-center flex-shrink-0 relative group">
               {editData.profilePicture ? (
                <img src={editData.profilePicture} alt="Avatar" className="h-full w-full object-cover" />
               ) : (
                <span className="text-gray-400 text-3xl">📷</span>
               )}
               <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold">Change</span>
               </div>
               <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>

            <div className="flex-grow w-full space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
                <input type="text" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Email Address (Read Only)</label>
                <input type="email" value={user.email} disabled className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 outline-none cursor-not-allowed font-medium" />
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              {/* 🌟 RESET LOGIC ON CANCEL */}
              <button 
                type="button" 
                onClick={() => {
                  setIsEditing(false);
                  setEditData({ name: user.name, profilePicture: user.profilePicture || '' });
                }} 
                className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button type="submit" disabled={updateLoading} className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md">
                {updateLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          /* DISPLAY MODE (UNCHANGED) */
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-32 w-32 bg-indigo-600 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-lg border-4 border-indigo-50 flex-shrink-0 overflow-hidden">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-grow text-center md:text-left">
              <h1 className="text-3xl font-black text-gray-900">{user.name}</h1>
              <p className="text-gray-500 font-medium mb-4">{user.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                <span className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide">
                  {user.role === 'admin' ? 'Admin' : 'Member'}
                </span>
                {user.sellerStatus === 'approved' && (
                  <span className="bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide">
                    Verified Seller
                  </span>
                )}
              </div>
              <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm hover:underline">
                ✎ Edit Profile
              </button>
            </div>
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
        )}
      </div>

      {/* SAVED BOOKS SECTION (UNCHANGED) */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2 flex items-center gap-2">
          <span>❤️</span> My Saved Books
        </h2>
        {loading ? (
          <div className="flex justify-center py-20 text-indigo-600 font-bold">Loading...</div>
        ) : savedBooks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-2">No saved books yet!</h3>
            <Link to="/" className="text-indigo-600 font-bold hover:underline">Browse Marketplace &rarr;</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {savedBooks.map(book => <BookCard key={book._id} book={book} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;