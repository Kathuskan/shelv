import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AddBook() {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Mystery & Thriller',
    listingType: 'Sale',
    condition: 'New',
    price: '',
    rentalPeriod: '',
    extraDayPrice: '',
    image: '', // FIXED: Changed 'Image' to 'image' so it matches the backend!
    description: '',
    contactEmail: '',
    contactPhone: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Converts the image file into a Base64 text string
  const handleImageUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
      // --- STRICT FILE TYPE VALIDATION ---
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

      if (!validTypes.includes(file.type)) {
        alert("Please upload a valid web image (JPG, PNG, or WebP).");
        e.target.value = ''; 
        return; 
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- NEW: SRI LANKAN PHONE NUMBER LOGIC ---
    // 1. Strip out any spaces or dashes the user might have typed
    const cleanPhone = formData.contactPhone.replace(/[\s-]/g, '');
    
    // 2. Check if it starts with '07' and is exactly 10 digits long
    const phoneRegex = /^07\d{8}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      alert("Please enter a valid 10-digit Sri Lankan phone number (e.g., 071 234 5678).");
      return; // Stops the form from submitting!
    }
    // ------------------------------------------

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert("You must be logged in to post a book.");
        navigate('/login');
        return;
      }

      // Update formData with the cleaned phone number before sending
      const finalData = { ...formData, contactPhone: cleanPhone };

      const response = await axios.post('http://localhost:5001/api/books', finalData, {
        headers: {
          Authorization: `Bearer ${token}` 
        }
      });

      console.log("Success:", response.data);
      alert('📚 Book added to Shelv successfully!');
      navigate('/');

    } catch (error) {
      console.error("Error adding book:", error.response?.data || error.message);
      alert(error.response?.data?.message || 'Failed to add book. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">List a Book on Shelv</h2>
          <p className="text-indigo-200 text-sm mt-1">Fill out the details below to add to the inventory.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Book Title</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none" placeholder="e.g. Introduction to Algorithms" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Author Name</label>
              <input type="text" name="author" value={formData.author} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none" placeholder="e.g. Thomas H. Cormen" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ISBN Number</label>
              <input type="text" name="isbn" value={formData.isbn} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none" placeholder="e.g. 978-0262033848" />
            </div>
            
            <div className="col-span-1 md:col-span-2">
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
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Listing Type</label>
              <select name="listingType" value={formData.listingType} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none bg-white">
                <option value="Sale">For Sale</option>
                <option value="Rent">For Rent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
              <select name="condition" value={formData.condition} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none bg-white">
                <option value="New">New</option>
                <option value="Used">Used</option>
              </select>
            </div>

            {/* --- 🌟 DYNAMIC PRICING UI --- */}
            {formData.listingType === 'Sale' ? (
              // IF SALE: Show standard single price
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Selling Price (Rs)</label>
                <input type="number" name="price" min="0" step="1" value={formData.price} onChange={handleChange} required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. 1500" />
              </div>
            ) : (
              // IF RENT: Show the 3-part package builder
              <div className="col-span-1 md:col-span-2 bg-indigo-50 p-6 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <h4 className="text-sm font-bold text-indigo-900 mb-1">Rental Package Details</h4>
                  <p className="text-xs text-indigo-600 mb-3">Define your base rental package and late fees.</p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Base Period (Days)</label>
                  <input type="number" name="rentalPeriod" min="1" value={formData.rentalPeriod} onChange={handleChange} required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. 7" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Base Package Price (Rs)</label>
                  <input type="number" name="price" min="0" value={formData.price} onChange={handleChange} required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. 500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Extra Day Charge (Rs)</label>
                  <input type="number" name="extraDayPrice" min="0" value={formData.extraDayPrice} onChange={handleChange} required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. 50" />
                </div>
              </div>
            )}
            {/* -------------------------------- */}

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Book Image</label>
              <input type="file" name="image" onChange={handleImageUpload} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none" />
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Book Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="3"
                placeholder="Describe the condition, edition, or any extra details..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none resize-none"
              />
            </div>

            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Contact Email</label>
                <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} required placeholder="seller@example.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Contact Phone</label>
                <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} required placeholder="07X XXX XXXX" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
              </div>
            </div>

          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-xl transition-colors duration-300 mt-8 shadow-lg shadow-indigo-200">
            Publish Listing
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddBook;