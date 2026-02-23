import { useEffect, useState } from 'react';
import axios from 'axios';

function Admin() {
  const [books, setBooks] = useState([]);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // NEW STATE
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Fetch books, pending sellers, AND all users simultaneously
      const [booksRes, sellersRes, usersRes] = await Promise.all([
        axios.get('http://localhost:5001/api/books'),
        axios.get('http://localhost:5001/api/admin/pending-sellers', config),
        axios.get('http://localhost:5001/api/admin/users', config) // Fetching the master list
      ]);

      setBooks(booksRes.data);
      setPendingSellers(sellersRes.data);
      setAllUsers(usersRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setLoading(false);
    }
  };

  // --- ADMIN ACTIONS ---
  const handleApprove = async (userId) => {
    try {
      await axios.put(`http://localhost:5001/api/admin/approve-seller/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData(); 
    } catch (err) { alert("Failed to approve seller."); }
  };

  const handleReject = async (userId) => {
    if (!window.confirm("Reject this seller application?")) return;
    try {
      await axios.put(`http://localhost:5001/api/admin/reject-seller/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData(); 
    } catch (err) { alert("Failed to reject seller."); }
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

  if (loading) return <div className="p-10 text-center font-bold text-xl text-indigo-600 animate-pulse">Loading Admin Systems...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Admin Control Center</h1>
          <p className="text-gray-500 mt-2">Manage users, approve sellers, and moderate inventory.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 text-center">
            <span className="block text-2xl font-black text-indigo-600">{allUsers.length}</span>
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Total Users</span>
          </div>
          <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 text-center">
            <span className="block text-2xl font-black text-emerald-600">{books.length}</span>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Total Books</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SECTION 1: PENDING REQUESTS */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-amber-800">Pending Approvals</h2>
            <span className="bg-amber-200 text-amber-800 py-1 px-3 rounded-full text-xs font-bold">{pendingSellers.length}</span>
          </div>
          <div className="p-6 flex-grow">
            {pendingSellers.length === 0 ? (
              <p className="text-gray-500 italic text-center py-8">No pending requests.</p>
            ) : (
              <div className="space-y-4">
                {pendingSellers.map(user => (
                  <div key={user._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                    <div className="mb-4 sm:mb-0">
                      <p className="font-bold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(user._id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition-colors text-sm w-full sm:w-auto">Approve</button>
                      <button onClick={() => handleReject(user._id)} className="bg-gray-200 hover:bg-red-100 text-gray-700 hover:text-red-700 px-4 py-2 rounded-lg font-bold transition-colors text-sm w-full sm:w-auto">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: USER MANAGEMENT */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">User Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white text-gray-400 text-xs uppercase font-bold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allUsers.map(user => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        user.sellerStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        user.sellerStatus === 'restricted' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {user.sellerStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.sellerStatus !== 'restricted' && (
                        <button onClick={() => handleRestrict(user._id, user.name)} className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 px-3 py-1 rounded hover:bg-red-100 transition-colors">
                          Restrict
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* SECTION 3: GLOBAL INVENTORY (Full Width) */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
          <h2 className="text-xl font-bold text-indigo-900">Global Book Inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white text-gray-400 text-xs uppercase font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Book Title</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {books.map(book => (
                <tr key={book._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{book.title}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{book.author}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase">{book.listingType}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteBook(book._id, book.title)} className="text-red-500 hover:text-red-700 font-bold text-sm">
                      Delete Listing
                    </button>
                  </td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500 italic">No books currently listed in the marketplace.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Admin;