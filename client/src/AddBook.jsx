import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AddBook() {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Science & Technology',
    listingType: 'Sale',
    condition: 'New',
    price: '',
    rentalPeriod: '',
    extraDayPrice: '',
    description: '',
    contactEmail: '',
    contactPhone: ''
  });

  // 🌟 NEW: Separate state for Cloudinary file & UI Preview
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 2. The New Multiple Upload Handler
  const handleImageUpload = (e) => {
    // Convert the FileList object to an actual Array
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    // Check minimum and maximum
    if (files.length > 5) {
      alert("You can only upload a maximum of 5 images.");
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const allValid = files.every(file => validTypes.includes(file.type));

    if (!allValid) {
      alert("Please upload valid web images only (JPG, PNG, WebP).");
      e.target.value = '';
      return;
    }

    setImageFiles(files);

    // Create an array of preview URLs
    const filePreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(filePreviews);
  };
  // 🌟 NEW: Moves the clicked image to the front of the array (Index 0)
  const setAsCover = (index) => {
    if (index === 0) return; // It's already the cover!

    const updatedFiles = [...imageFiles];
    const updatedPreviews = [...previews];

    // Remove the selected item and grab it
    const [selectedFile] = updatedFiles.splice(index, 1);
    const [selectedPreview] = updatedPreviews.splice(index, 1);

    // Put it at the very beginning
    updatedFiles.unshift(selectedFile);
    updatedPreviews.unshift(selectedPreview);

    setImageFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // --- SRI LANKAN PHONE NUMBER LOGIC ---
    const cleanPhone = formData.contactPhone.replace(/[\s-]/g, '');
    const phoneRegex = /^07\d{8}$/;

    if (!phoneRegex.test(cleanPhone)) {
      alert("Please enter a valid 10-digit Sri Lankan phone number (e.g., 071 234 5678).");
      setLoading(false);
      return;
    }

    if (imageFiles.length === 0) {
      alert("Please select at least 1 image.");
      setLoading(false);
      return;
    }

    // --- 🌟 PREPARE FORMDATA FOR CLOUDINARY ---
    const data = new FormData();

    // 1. Append the images
    imageFiles.forEach(file => {
      data.append('images', file);
    });

    // 2. Append the text fields (EXACTLY ONCE!)
    Object.keys(formData).forEach(key => {
      // Skip rental fields if it's a sale
      if (formData.listingType === 'Sale' && (key === 'rentalPeriod' || key === 'extraDayPrice')) {
        return;
      }

      if (key === 'contactPhone') {
        data.append(key, cleanPhone);
      } else {
        data.append(key, formData[key]);
      }
    });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert("You must be logged in to post a book.");
        navigate('/login');
        return;
      }

      await axios.post('http://localhost:5001/api/books', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      alert('📚 Book listed successfully!');
      navigate('/');

    } catch (error) {
      console.error("Error adding book:", error.response?.data || error.message);
      alert(error.response?.data?.message || 'Failed to add book. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">List a Book on Shelv</h2>
          <p className="text-indigo-200 text-sm mt-1">Images are safely stored on the cloud.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Book Title</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. Introduction to Algorithms" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Author Name</label>
              <input type="text" name="author" value={formData.author} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. Donald Knuth" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ISBN Number</label>
              <input type="text" name="isbn" value={formData.isbn} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. 978-0262033848" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Book Category</label>
              <select name="category" value={formData.category} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-white">
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
                <option value="Finance">Finance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Listing Type</label>
              <select name="listingType" value={formData.listingType} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-white">
                <option value="Sale">For Sale</option>
                <option value="Rent">For Rent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
              <select name="condition" value={formData.condition} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-white">
                <option value="New">New</option>
                <option value="Used">Used</option>
              </select>
            </div>

            {formData.listingType === 'Sale' ? (
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Selling Price (Rs)</label>
                <input type="number" name="price" min="0" value={formData.price} onChange={handleChange} required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none placeholder:text-gray-400" placeholder="e.g. 1000" />
              </div>
            ) : (
              <div className="col-span-1 md:col-span-2 bg-indigo-50 p-6 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Base Period (Days)</label>
                  <input type="number" name="rentalPeriod" min="1" value={formData.rentalPeriod} onChange={handleChange} required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. 7" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Base Price (Rs)</label>
                  <input type="number" name="price" min="0" value={formData.price} onChange={handleChange} required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. 500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Extra Day Charge (Rs)</label>
                  <input type="number" name="extraDayPrice" min="0" value={formData.extraDayPrice} onChange={handleChange} required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. 100" />
                </div>
              </div>
            )}

            {/* 4. Update the JSX Input and Previews in the return statement */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Upload Images (Min 1, Max 5)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                required
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />

              {/* Display Image Previews as a Grid */}
              {/* Display Image Previews as a Grid */}
              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-4">
                  {previews.map((src, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-200 transition-all">
                      <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />

                      {/* Cover Badge */}
                      {index === 0 ? (
                        <span className="absolute bottom-0 left-0 right-0 bg-indigo-600 bg-opacity-90 text-white text-[10px] text-center py-1 font-bold">
                          Cover Image
                        </span>
                      ) : (
                        /* Make Cover Button (Only shows on non-cover images) */
                        <button
                          type="button"
                          onClick={() => setAsCover(index)}
                          className="absolute top-1 right-1 bg-white/90 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded shadow hover:bg-indigo-600 hover:text-white transition-colors"
                        >
                          Set Cover
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Book Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} required rows="3"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none resize-none placeholder:text-gray-400" placeholder="Enter book description..." />
            </div>

            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Contact Email</label>
                <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none placeholder:text-gray-400" placeholder="e.g. john.doe@example.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Contact Phone</label>
                <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none placeholder:text-gray-400" placeholder="e.g. 076543210" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 mt-8 shadow-lg shadow-indigo-200 active:scale-95 disabled:bg-gray-400">
            {loading ? "Publishing..." : "Publish Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddBook;