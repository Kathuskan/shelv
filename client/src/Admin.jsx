import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Admin() {
  const [books, setBooks] = useState([]);
  const [allUsers, setAllUsers] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // NEW: States for our Dropdowns
  const [selectedSeller, setSelectedSeller] = useState('All');
  const [expandedUser, setExpandedUser] = useState(null); // Tracks which user row is open

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [booksRes, usersRes] = await Promise.all([
        axios.get('http://localhost:5001/api/books'),
        axios.get('http://localhost:5001/api/admin/users', config) 
      ]);

      setBooks(booksRes.data);
      setAllUsers(usersRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setLoading(false);
    }
  };

  const handleRestrict = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to revoke ${name}'s selling privileges?`)) return;
    try {
      await axios.put(`http://localhost:5001/api/admin/restrict-user/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData(); 
    } catch (err) { alert("Failed to restrict user."); }
  };

  const handleDeleteBook = async (id, title) => {
    if (!window.confirm(`Delete "${title}" forever?`)) return;
    try {
      await axios.delete(`http://localhost:5001/api/books/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setBooks(books.filter(b => b._id !== id));
    } catch (err) { alert("Permission denied."); }
  };

  // --- HELPER FUNCTIONS ---
  const getSellerName = (sellerId) => {
    const seller = allUsers.find(user => user._id === sellerId);
    return seller ? seller.name : <span className="text-red-400 italic">Deleted User</span>;
  };

  // Toggle the Accordion row
  const toggleExpand = (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null); // Close it if it's already open
    } else {
      setExpandedUser(userId); // Open the clicked user's row
    }
  };

  const displayedBooks = selectedSeller === 'All' 
    ? books 
    : books.filter(book => book.seller === selectedSeller);

  const activeSellers = allUsers.filter(user => user.sellerStatus === 'approved');

  if (loading) return <div className="p-10 text-center font-bold text-xl text-indigo-600 animate-pulse">Loading Admin Systems...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="mt-8 md:mt-0">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Admin Control Center</h1>
          <p className="text-gray-500 mt-2">Manage users and moderate the global inventory.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-indigo-50 px-6 py-3 rounded-xl border border-indigo-100 text-center flex-grow md:flex-grow-0">
            <span className="block text-3xl font-black text-indigo-600">{allUsers.length}</span>
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Total Users</span>
          </div>
          <div className="bg-emerald-50 px-6 py-3 rounded-xl border border-emerald-100 text-center flex-grow md:flex-grow-0">
            <span className="block text-3xl font-black text-emerald-600">{books.length}</span>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Total Books</span>
          </div>
        </div>
      </div>

      {/* --- SECTION 1: USER MANAGEMENT --- */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">User Management</h2>
          <p className="text-xs text-gray-500 mt-1">Click on a user to see their active listings.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white text-gray-400 text-xs uppercase font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allUsers.map(user => {
                // Find books specifically for this loop's user
                const userBooks = books.filter(b => b.seller === user._id);
                const isExpanded = expandedUser === user._id;

                return (
                  <React.Fragment key={user._id}>
                    {/* The Main Row (Now Clickable) */}
                    <tr 
                      onClick={() => toggleExpand(user._id)} 
                      className={`transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 flex items-center gap-2">
                          {user.name} 
                          {/* Chevron Arrow Icon */}
                          <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </p>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{user.role}</p>
                        {user.sellerStatus === 'approved' && (
                          <span className="text-[10px] font-bold text-indigo-600 mt-1 block">
                            {userBooks.length} Listings
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          user.sellerStatus === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          user.sellerStatus === 'restricted' ? 'bg-red-100 text-red-800 border border-red-200' :
                          'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {user.sellerStatus === 'none' ? 'Buyer' : user.sellerStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.sellerStatus !== 'restricted' && (
                          <button 
                            // e.stopPropagation() prevents the row from expanding when clicking the restrict button!
                            onClick={(e) => { e.stopPropagation(); handleRestrict(user._id, user.name); }} 
                            className="text-red-600 hover:text-white font-bold text-sm bg-red-50 px-4 py-2 rounded-lg hover:bg-red-600 transition-colors border border-red-100 hover:border-red-600"
                          >
                            Restrict User
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* --- 🌟 NEW: THE EXPANDABLE DROPDOWN ROW 🌟 --- */}
                    {isExpanded && (
                      <tr className="bg-indigo-50/50">
                        <td colSpan="4" className="px-6 py-6 border-b border-indigo-100">
                          <h4 className="text-sm font-bold text-indigo-900 mb-4">{user.name}'s Active Listings</h4>
                          
                          {userBooks.length === 0 ? (
                            <p className="text-sm text-gray-500 italic bg-white p-4 rounded-xl border border-gray-200 shadow-sm inline-block">
                              This user currently has no books listed.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {userBooks.map(book => (
                                <div key={book._id} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-between">
                                  <div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${book.listingType === 'Rent' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                      {book.listingType}
                                    </span>
                                    <p className="font-bold text-sm text-gray-900 mt-2 line-clamp-1">{book.title}</p>
                                    <p className="text-xs text-gray-500 font-medium">Rs {book.price}.00</p>
                                  </div>
                                  
                                  {/* Delete shortcut right inside the accordion */}
                                  <button 
                                    onClick={() => handleDeleteBook(book._id, book.title)}
                                    className="mt-4 text-xs font-bold text-red-500 hover:text-red-700 self-start"
                                  >
                                    Delete Listing
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    {/* ------------------------------------------------ */}

                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- SECTION 2: GLOBAL INVENTORY --- */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-indigo-900">Global Book Inventory</h2>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-sm font-bold text-indigo-800 whitespace-nowrap">Filter by Seller:</label>
            <select 
              value={selectedSeller} 
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="px-3 py-2 rounded-lg border border-indigo-200 bg-white text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-600 w-full sm:w-auto"
            >
              <option value="All">All Sellers</option>
              {activeSellers.map(seller => (
                <option key={seller._id} value={seller._id}>{seller.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white text-gray-400 text-xs uppercase font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Book Title</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Listed By (Seller)</th> 
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayedBooks.map(book => (
                <tr key={book._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{book.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{book.author}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${book.listingType === 'Rent' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {book.listingType}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-700">
                    {getSellerName(book.seller)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteBook(book._id, book.title)} className="text-red-500 hover:text-red-700 font-bold text-sm hover:underline">
                      Delete Listing
                    </button>
                  </td>
                </tr>
              ))}
              {displayedBooks.length === 0 && (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500 italic">No books match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Admin;