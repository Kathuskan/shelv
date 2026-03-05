import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function EditBook() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // 1. Make sure image is in our initial state
  const [formData, setFormData] = useState({
    title: '', author: '', price: '', condition: 'New', listingType: 'Sale', image: ''
  });
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/books`);
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

  // 2. The Base64 Image Converter
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5001/api/seller/books/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Book updated successfully!');
      navigate('/my-listings');
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
        
        {/* 3. The Image Upload Section */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">Update Cover Image (Optional)</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            // Notice: NO 'required' attribute here!
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer outline-none"
          />
          {formData.image && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wide">Current Image Preview</p>
              <img src={formData.image} alt="Preview" className="h-32 w-24 object-cover rounded-lg shadow-sm border border-gray-200" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Book Title</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Author</label>
          <input type="text" name="author" value={formData.author} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
        </div>
        {/* UPDATED: Official Category Dropdown */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Book Category</label>
          <select 
            name="category" 
            value={formData.category} 
            onChange={handleChange} 
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
          >
            <option value="Mystery & Thriller">Mystery & Thriller</option>
            <option value="Science Fiction">Science Fiction</option>
            <option value="Fantasy">Fantasy</option>
            <option value="Romance">Romance</option>
            <option value="Biography">Biography</option>
            <option value="Self-Help">Self-Help</option>
            <option value="History">History</option>
            <option value="Children’s Books">Children’s Books</option>
            <option value="Business">Business</option>
            <option value="Science & Technology">Science & Technology</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Price (Rs)</label>
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