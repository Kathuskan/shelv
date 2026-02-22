import { useEffect, useState } from 'react';
import axios from 'axios';

function Admin() {
  const [books, setBooks] = useState([]);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  // Fetch everything when the page loads
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Fetch books and pending sellers at the same time
      const [booksRes, sellersRes] = await Promise.all([
        axios.get('http://localhost:5001/api/books'),
        axios.get('http://localhost:5001/api/admin/pending-sellers', config)
      ]);

      setBooks(booksRes.data);
      setPendingSellers(sellersRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setLoading(false);
    }
  };

  // Function to Approve a Seller
  const handleApprove = async (userId) => {
    try {
      await axios.put(`http://localhost:5001/api/admin/approve-seller/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Seller Approved!");
      fetchData(); // Refresh the lists
    } catch (err) {
      alert("Failed to approve seller.");
    }
  };

  // Function to Delete a Book
  const handleDeleteBook = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await axios.delete(`http://localhost:5001/api/books/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBooks(books.filter(b => b._id !== id));
    } catch (err) {
      alert("Permission denied.");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
      <h1 className="text-4xl font-black text-gray-900">Admin Control Center</h1>

      {/* SECTION 1: SELLER REQUESTS */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
          <h2 className="text-xl font-bold text-amber-800">Pending Seller Approvals</h2>
        </div>
        <div className="p-6">
          {pendingSellers.length === 0 ? (
            <p className="text-gray-500 italic">No pending requests at the moment.</p>
          ) : (
            <div className="space-y-4">
              {pendingSellers.map(user => (
                <div key={user._id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => handleApprove(user._id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                  >
                    Approve Seller
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: INVENTORY MANAGEMENT */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Global Inventory</h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Book Title</th>
              <th className="px-6 py-4">Author</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {books.map(book => (
              <tr key={book._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{book.title}</td>
                <td className="px-6 py-4 text-gray-500">{book.author}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDeleteBook(book._id, book.title)}
                    className="text-red-600 hover:text-red-800 font-bold text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Admin;