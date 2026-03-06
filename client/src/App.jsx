import { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import AddBook from './AddBook';
import Login from './Login';
import Admin from './Admin';
import Register from './Register';
import SellerDashboard from './SellerDashboard';
import EditBook from './EditBook';
import BookCard from './BookCard';
import BookDetails from './BookDetails';
import ApplySeller from './ApplySeller';
import Profile from './Profile';


// 1. The Home Component
function Home() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');

  // Our Official Categories List
  const categories = [
    "Mystery & Thriller", "Science Fiction", "Fantasy", "Romance",
    "Biography", "Self-Help", "History", "Children’s Books",
    "Business", "Science & Technology"
  ];

  useEffect(() => {
    axios.get('http://localhost:5001/api/books')
      .then(response => {
        setBooks(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching books:", error);
        setLoading(false);
      });
  }, []);

  // 1. Apply top-level search and dropdown filters
  const filteredBooks = books.filter((book) => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || book.listingType === filterType;
    const matchesCondition = conditionFilter === 'All' || book.condition === conditionFilter;

    return matchesSearch && matchesType && matchesCondition;
  });

  // 2. Get the 8 most recently added books (reversing the array so newest are first)
  const recentBooks = [...filteredBooks].reverse().slice(0, 8);

  // 3. Smooth Scroll Function for Quick Navigation
  const scrollToCategory = (categoryName) => {
    const element = document.getElementById(`category-${categoryName}`);
    if (element) {
      // Offset slightly so the navbar doesn't cover the title
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full">
      {/* --- SLEEK FULL-WIDTH CATEGORY BAR --- */}
      {/* FIXED: Moved outside the max-w container so it stretches edge-to-edge on ALL screens */}
      <div className="sticky top-19 z-50 bg-indigo-600 shadow-inner overflow-x-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 py-3 min-w-max">
            {categories.map(category => {
              const hasBooks = filteredBooks.some(book => book.category === category);
              if (!hasBooks) return null;

              return (
                <button
                  key={`nav-${category}`}
                  onClick={() => scrollToCategory(category)}
                  // FIXED: Changed to text-indigo-100 and hover:text-white for a smooth hover effect
                  className="whitespace-nowrap text-sm font-semibold tracking-wide text-white hover:text-white transition-colors"
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      {/* FIXED: Added py-8 back to restore the proper breathing room */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* --- TOP HEADER & SEARCH BAR --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Marketplace</h2>
            <span className="inline-block mt-2 bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
              {filteredBooks.length} Books Found
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search titles or authors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none w-full md:w-64"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer bg-white"
            >
              <option value="All">All Types</option>
              <option value="Rent">For Rent</option>
              <option value="Sale">For Sale</option>
            </select>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer bg-white"
            >
              <option value="All">All Conditions</option>
              <option value="New">New</option>
              <option value="Used">Used</option>
            </select>
          </div>
        </div>

        {/* --- DYNAMIC BOOK SECTIONS --- */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {filteredBooks.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xl text-gray-500 font-medium">No books match your filters.</p>
                <button onClick={() => { setSearchTerm(''); setFilterType('All'); setConditionFilter('All'); }} className="mt-4 text-indigo-600 font-bold hover:underline">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-16">

                {/* --- SECTION: RECENT LISTINGS --- */}
                {recentBooks.length > 0 && (
                  <section>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">🌟 Recently Added</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                      {recentBooks.map((book) => (
                        <BookCard key={`recent-${book._id}`} book={book} />
                      ))}
                    </div>
                  </section>
                )}

                {/* --- SECTIONS: CATEGORY WISE LISTINGS --- */}
                {categories.map((category) => {
                  const booksInCategory = filteredBooks.filter(book => book.category === category);

                  if (booksInCategory.length === 0) return null;

                  return (
                    <section key={`section-${category}`} id={`category-${category}`} className="scroll-mt-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">
                        {category} <span className="text-gray-400 text-lg font-normal ml-2">({booksInCategory.length})</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {booksInCategory.map((book) => (
                          <BookCard key={book._id} book={book} />
                        ))}
                      </div>
                    </section>
                  );
                })}

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// 2. The Main App Component
function App() {
  const user = JSON.parse(localStorage.getItem('user'));
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const requestSellerAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5001/api/auth/request-seller', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Application submitted!");
      const updatedUser = { ...user, sellerStatus: 'pending' };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.location.reload();
    } catch (err) {
      alert("Failed to submit request.");
    }
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        <nav className="sticky top-0 z-50 flex items-center justify-between bg-white shadow-md px-8 py-4 border-b border-gray-200">
          <Link to="/"><h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">📚 Shelv</h1></Link>

          <div className="flex gap-6 items-center">
            <Link to="/" className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">Home</Link>

            {user ? (
              <>
                {(user?.role === 'admin' || (user?.role === 'seller' && user?.sellerStatus === 'approved')) && (
                  <div className="flex gap-4 items-center">
                    <Link to="/my-listings" className="text-gray-600 font-semibold hover:text-indigo-600 transition-colors">My Listings</Link>
                    <Link to="/add-book" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-all">+ Add Book</Link>
                  </div>
                )}

                <div className="ml-4 border-l pl-6 border-gray-300 flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    {/* --- 🌟 NEW: AVATAR NAVBAR LINK 🌟 --- */}
                    <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-all p-1 pr-3 rounded-full hover:bg-indigo-50 border border-transparent hover:border-indigo-100">

                      {/* The Picture or Initials */}
                      <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-black text-white shadow-sm border-2 border-white overflow-hidden flex-shrink-0">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>

                      {/* The Greeting (Hidden on super tiny mobile screens to save space) */}
                      <span className="text-sm font-bold text-indigo-700 hidden sm:block">
                        Hi, {user.name?.split(' ')[0]}
                      </span>

                    </Link>
                    {/* ------------------------------------- */}
                    {/* REPLACED: Now links to the verification page instead of an instant API call */}
                    {user?.sellerStatus === 'none' && user?.role !== 'admin' && (
                      <Link to="/apply-seller" className="text-[10px] bg-amber-500 hover:bg-amber-600 transition-colors text-white px-3 py-1 rounded-full mt-1 font-bold tracking-wide uppercase">
                        Become a Seller
                      </Link>
                    )}
                    {user?.sellerStatus === 'pending' && <span className="text-[10px] text-amber-600 font-bold italic">Pending...</span>}
                    {user?.role === 'admin' && <Link to="/admin" className="text-[10px] text-red-600 font-bold">Admin Panel</Link>}
                  </div>
                  <button onClick={handleLogout} className="text-red-600 font-semibold hover:text-red-800">Logout</button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4 ml-4 border-l pl-6 border-gray-300">
                <Link to="/login" className="text-gray-600 font-semibold hover:text-gray-900 transition-colors">Log In</Link>
                <Link to="/register" className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-all shadow-md">Sign Up</Link>
              </div>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/book/:id" element={<BookDetails />} />

          <Route
            path="/add-book"
            element={
              (user?.role === 'admin' || (user?.role === 'seller' && user?.sellerStatus === 'approved'))
                ? <AddBook />
                : <Navigate to="/" replace />
            }
          />

          <Route
            path="/admin"
            element={
              user?.role === 'admin'
                ? <Admin />
                : <Navigate to="/" replace />
            }
          />
          <Route
            path="/my-listings"
            element={
              (user?.role === 'admin' || (user?.role === 'seller' && user?.sellerStatus === 'approved'))
                ? <SellerDashboard />
                : <Navigate to="/" replace />
            }
          />
          <Route
            path="/edit-book/:id"
            element={
              (user?.role === 'admin' || (user?.role === 'seller' && user?.sellerStatus === 'approved'))
                ? <EditBook />
                : <Navigate to="/" replace />
            }
          />
          {/* VERIFICATION ROUTE */}
          <Route
            path="/apply-seller"
            element={user ? <ApplySeller /> : <Navigate to="/login" replace />}
          />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;