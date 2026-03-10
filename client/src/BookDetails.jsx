import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import BookCard from './BookCard';

function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [book, setBook] = useState(null);
  const [suggestions, setSuggestions] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [isSaved, setIsSaved] = useState(false); 
  const [isAnimating, setIsAnimating] = useState(false);

  // 🌟 NEW: State to track which image is showing in the gallery
  const [mainImageIndex, setMainImageIndex] = useState(0);

  const token = localStorage.getItem('token');

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowContact(false); 
    setLoading(true);
    setMainImageIndex(0); // Reset gallery to first image when a new book loads

    const fetchData = async () => {
      try {
        const bookResponse = await axios.get(`http://localhost:5001/api/books/${id}`);
        const currentBook = bookResponse.data;
        setBook(currentBook);

        if (token) {
          const savedRes = await axios.get('http://localhost:5001/api/user/saved-books', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const alreadySaved = savedRes.data.some(savedBook => savedBook._id === id);
          setIsSaved(alreadySaved);
        }

        const allBooksResponse = await axios.get(`http://localhost:5001/api/books`);
        const allBooks = allBooksResponse.data;

        const otherBooks = allBooks.filter(b => b._id !== currentBook._id);
        const sameCategory = otherBooks.filter(b => b.category === currentBook.category);
        const differentCategory = otherBooks.filter(b => b.category !== currentBook.category);
        
        const mixedSuggestions = [...sameCategory, ...differentCategory].slice(0, 4);
        setSuggestions(mixedSuggestions);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  const handleToggleSave = async () => {
    if (!token) {
      alert("Please log in to save books to your profile!");
      navigate('/login');
      return;
    }

    try {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300); 

      setIsSaved(!isSaved);

      await axios.post('http://localhost:5001/api/user/save-book', 
        { bookId: id }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      setIsSaved(!isSaved);
      console.error("Failed to save book:", error);
      alert("Something went wrong while saving. Please try again.");
    }
  };

  if (loading) return <div className="text-center py-20 text-indigo-600 font-bold text-xl animate-pulse">Loading Book Details...</div>;
  if (!book) return <div className="text-center py-20 text-red-500 font-bold text-xl">Book not found.</div>;

  // Helper variable to grab the active image safely
  const activeImage = book.images && book.images.length > 0 
    ? book.images[mainImageIndex] 
    : (book.image || 'https://via.placeholder.com/400x600?text=No+Cover');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/" className="text-indigo-600 font-semibold hover:underline mb-6 inline-block">&larr; Back to Inventory</Link>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* --- 📸 IMAGE GALLERY SECTION --- */}
        <div className="md:w-1/2 bg-gray-50 p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-gray-100">
          
          {/* Main Large Image */}
          <div className="w-full flex items-center justify-center h-[400px] mb-4">
            <img 
              src={activeImage} 
              alt={book.title} 
              className="max-w-full max-h-full object-contain drop-shadow-md transition-opacity duration-300"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/400x600?text=No+Cover' }} 
            />
          </div>

          {/* Thumbnail Slider (Only shows if there are multiple images) */}
          {book.images && book.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto py-2 w-full justify-center px-2">
              {book.images.map((imgUrl, index) => (
                <button 
                  key={index}
                  onClick={() => setMainImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    mainImageIndex === index 
                      ? 'border-indigo-600 shadow-md scale-105' 
                      : 'border-transparent opacity-60 hover:opacity-100 hover:scale-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* --- 📝 BOOK DETAILS SECTION --- */}
        <div className="md:w-1/2 p-6 lg:p-8 flex flex-col">
          <div className="flex gap-2 mb-4">
            <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${book.listingType === 'Rent' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              For {book.listingType}
            </span>
            <span className="text-xs text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-full">
              Condition: {book.condition}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-1 leading-tight">{book.title}</h1>
          <p className="text-base text-gray-500 mb-4 border-b border-gray-100 pb-4">by {book.author}</p>
          
          <div className="mb-6 flex-grow">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{book.description}</p>
          </div>
          
          <div className="mb-6">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">
              {book.listingType === 'Rent' ? 'Rental Package' : 'Asking Price'}
            </p>
            
            {book.listingType === 'Rent' ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-indigo-600">Rs {book.price}.00</span>
                  <span className="text-lg font-bold text-gray-500">/ {book.rentalPeriod} days</span>
                </div>
                {book.extraDayPrice && (
                  <div className="mt-1">
                    <span className="inline-block bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-200">
                      Late Fee: + Rs {book.extraDayPrice}.00 per extra day
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-3xl font-extrabold text-indigo-600">Rs {book.price}.00</p>
            )}
          </div>

          {showContact ? (
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 animate-fade-in">
              <p className="text-xs font-bold text-indigo-800 mb-3 uppercase tracking-wide">Seller Contact Info</p>
              
              <div className="space-y-2">
                <p className="flex items-center text-sm text-gray-900">
                  <span className="font-bold w-16">Email:</span> 
                  <a href={`mailto:${book.contactEmail}`} className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium break-all">{book.contactEmail}</a>
                </p>
                <p className="flex items-center text-sm text-gray-900">
                  <span className="font-bold w-16">Phone:</span> 
                  <a href={`tel:${book.contactPhone}`} className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium">{book.contactPhone}</a>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button 
                onClick={() => setShowContact(true)} 
                className="flex-grow bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl text-base transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Contact Seller
              </button>
              
              <button 
                onClick={handleToggleSave}
                title={isSaved ? "Remove from Saved" : "Save for Later"}
                className={`px-5 py-3 rounded-xl font-bold text-xl transition-all duration-300 shadow-sm flex items-center justify-center transform border ${
                  isAnimating ? 'scale-125 rotate-12' : 'hover:-translate-y-0.5 active:scale-90'
                } ${
                  isSaved 
                    ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100' 
                    : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'
                }`}
              >
                {isSaved ? '❤️' : '🤍'}
              </button>
            </div>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-16">
          <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">You Might Also Like</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {suggestions.map(suggestedBook => (
              <BookCard key={suggestedBook._id} book={suggestedBook} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BookDetails;