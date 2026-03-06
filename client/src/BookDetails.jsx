import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import BookCard from './BookCard'; // 🌟 NEW: We need this to show the suggestions!

function BookDetails() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [suggestions, setSuggestions] = useState([]); // 🌟 NEW: State for suggested books
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    // 🌟 Auto-scroll to top when a user clicks a suggestion
    window.scrollTo(0, 0);
    setShowContact(false); // Hide contact info when a new book loads
    setLoading(true);

    const fetchData = async () => {
      try {
        // 1. Fetch the main book
        const bookResponse = await axios.get(`http://localhost:5001/api/books/${id}`);
        const currentBook = bookResponse.data;
        setBook(currentBook);

        // 2. Fetch all books to build suggestions
        const allBooksResponse = await axios.get(`http://localhost:5001/api/books`);
        const allBooks = allBooksResponse.data;

        // 3. Filter out the book we are currently looking at
        const otherBooks = allBooks.filter(b => b._id !== currentBook._id);
        
        // 4. Try to find books in the same category first!
        const sameCategory = otherBooks.filter(b => b.category === currentBook.category);
        const differentCategory = otherBooks.filter(b => b.category !== currentBook.category);
        
        // 5. Combine them and grab the top 4
        const mixedSuggestions = [...sameCategory, ...differentCategory].slice(0, 4);
        
        setSuggestions(mixedSuggestions);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="text-center py-20 text-indigo-600 font-bold text-xl animate-pulse">Loading Book Details...</div>;
  if (!book) return <div className="text-center py-20 text-red-500 font-bold text-xl">Book not found.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/" className="text-indigo-600 font-semibold hover:underline mb-6 inline-block">&larr; Back to Inventory</Link>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Large Image (Slightly smaller max-height) */}
        <div className="md:w-1/2 bg-gray-50 p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100">
          <img 
            src={book.image} 
            alt={book.title} 
            className="max-w-full max-h-[400px] object-contain drop-shadow-md"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/400x600?text=No+Cover' }} 
          />
        </div>

        {/* Right Side: Book Details (Reduced padding and text sizes) */}
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
          
          {/* Dynamic Pricing */}
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

          {/* Contact Info Reveal */}
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
            <button 
              onClick={() => setShowContact(true)} 
              className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl text-base transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Contact Seller
            </button>
          )}
        </div>
      </div>

      {/* --- 🌟 NEW: SUGGESTIONS GRID 🌟 --- */}
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