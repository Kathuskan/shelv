import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function EditBook() {
  const { id } = useParams(); // Gets the book ID from the URL
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '', author: '', price: '', condition: 'New', listingType: 'Sale'
  });
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  // Fetch the existing book data when the page loads
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/books`);
        // Find the specific book from the public list
        const bookToEdit = response.data.find(b => b._id === id);
        if (bookToEdit) {
          setFormData(bookToEdit);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching book:", error);
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5001/api/seller/books/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Book updated successfully!');
      navigate('/my-listings'); // Send them back to their dashboard
    } catch (error) {
      alert('Failed to update book.');
      console.error(error);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-indigo-600">Loading Book Data...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-black text-gray-900 mb-8">Edit Listing</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Book Title</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Author</label>
          <input type="text" name="author" value={formData.author} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Price ($)</label>
            <input type="number" name="price" value={formData.price} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Condition</label>
            <select name="condition" value={formData.condition} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none">
              <option value="New">New</option>
              <option value="Used">Used</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Listing Type</label>
          <select name="listingType" value={formData.listingType} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none">
            <option value="Sale">For Sale</option>
            <option value="Rent">For Rent</option>
          </select>
        </div>

        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md">
          Save Changes
        </button>
      </form>
    </div>
  );
}

export default EditBook;