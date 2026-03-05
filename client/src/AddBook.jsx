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
    Image: '',
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
      // --- NEW: STRICT FILE TYPE VALIDATION ---
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

      if (!validTypes.includes(file.type)) {
        alert("Please upload a valid web image (JPG, PNG, or WebP).");
        e.target.value = ''; // Instantly clears the bad file from the input
        return; // Stops the function dead in its tracks
      }
      // ----------------------------------------

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
      // 1. Retrieve the digital ID card from the browser's memory
      const token = localStorage.getItem('token');

      // Safety check: If they somehow got to this page without a token, boot them to login
      if (!token) {
        alert("You must be logged in to post a book.");
        navigate('/login');
        return;
      }

      // 2. Send the POST request WITH the Authorization header
      const response = await axios.post('http://localhost:5001/api/books', formData, {
        headers: {
          Authorization: `Bearer ${token}` // <--- Presenting the VIP wristband to the Bouncer
        }
      });

      console.log("Success:", response.data);
      alert('📚 Book added to Shelv successfully!');

      // 3. Send the user back to the Home page to see their new listing
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
            {/* UPDATED: Official Category Dropdown */}
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

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price (Rs)</label>
              <input type="number" name="price" min="0" step="1" value={formData.price} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none" placeholder="0" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Book Image</label>
              <input type="file" name="image" onChange={handleImageUpload} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none" />
            </div>
            {/* NEW: Description Area */}
            <div>
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



            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Contact Email</label>
              <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} required placeholder="seller@example.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />

              <label className="block text-sm font-bold text-gray-700 mb-2">Contact Phone</label>
              <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} required placeholder="07X XXX XXXX" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
            </div>

          </div>

          <button type="submit" className="w-full bg-gray-900 hover:bg-indigo-600 text-white font-bold py-4 px-8 rounded-xl transition-colors duration-300 mt-8 shadow-lg shadow-indigo-200">
            Publish Listing
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddBook;