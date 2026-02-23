import { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import AddBook from './AddBook';
import Login from './Login';
import Admin from './Admin';
import Register from './Register';
import SellerDashboard from './SellerDashboard';
import EditBook from './EditBook';

// 1. The Home Component
function Home() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All'); // NEW: Condition State

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

  // UPDATED: The Filtering Logic
  const filteredBooks = books.filter((book) => {
    // 1. Check Search Term
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Check Listing Type (Rent vs Sale)
    const matchesType = filterType === 'All' || book.listingType === filterType;

    // 3. Check Condition (New vs Used)
    const matchesCondition = conditionFilter === 'All' || book.condition === conditionFilter;

    // Only return true if ALL THREE conditions are met
    return matchesSearch && matchesType && matchesCondition;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Current Inventory</h2>
          <span className="inline-block mt-2 bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
            {filteredBooks.length} Books Found
          </span>
        </div>

        {/* UPDATED: Search & Filter UI */}
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
            {/* Make sure "Sale" matches what's in your database exactly! */}
            <option value="Sale">For Sale</option>
          </select>

          {/* NEW: Condition Dropdown */}
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer bg-white"
          >
            <option value="All">All Conditions</option>
            {/* Make sure these match the exact words saved in your AddBook form! */}
            <option value="New">New</option>
            <option value="Used">Used</option>
          </select>
        </div>
      </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredBooks.map((book) => (
                <div key={book._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide ${book.listingType === 'Rent' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {book.listingType}
                      </span>
                      <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                        {book.condition}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{book.title}</h3>
                    <p className="text-gray-500 text-sm mb-4">by {book.author}</p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-100 text-2xl font-extrabold text-indigo-600">${book.price}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


// 2. The Main App Component
function App() {
  const user = JSON.parse(localStorage.getItem('user'));

  // THE DIAGNOSTIC LOG
  console.log("Current User from Storage:", user);

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
      // Updated this line to use sellerStatus
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
        <nav className="flex items-center justify-between bg-white shadow-md px-8 py-4 mb-8 border-b border-gray-200">
          <Link to="/"><h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">📚 Shelv</h1></Link>

          <div className="flex gap-6 items-center">
            <Link to="/" className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">Home</Link>

            {user ? (
              <>
                {/* INSIDE YOUR NAV BAR */}
                {(user?.role === 'admin' || (user?.role === 'seller' && user?.sellerStatus === 'approved')) && (
                  <div className="flex gap-4 items-center">
                    <Link to="/my-listings" className="text-gray-600 font-semibold hover:text-indigo-600 transition-colors">My Listings</Link>
                    <Link to="/add-book" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-all">+ Add Book</Link>
                  </div>
                )}

                <div className="ml-4 border-l pl-6 border-gray-300 flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-900">Hi, {user.name?.split(' ')[0]}</span>

                    {/* PASTE THIS TRUTH SERUM LINE: */}
                    {/* <div className="text-xs font-mono bg-red-500 text-white px-2 py-1 mt-1 rounded">DEBUG ROLE: "{user?.role}"</div> */}
                    {/* FIXED: Check sellerStatus specifically */}
                    {user?.sellerStatus === 'none' && user?.role !== 'admin' && (
                      <button onClick={requestSellerAccount} className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded mt-1">Become a Seller</button>
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
          {/* PROTECTED ROUTE: Only Admins or Approved Sellers */}
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
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;