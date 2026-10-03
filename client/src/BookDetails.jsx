import { useEffect, useState } from 'react';
import axios from './api/axios'; 
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
  const [mainImageIndex, setMainImageIndex] = useState(0);
  
  const [paymentLoading, setPaymentLoading] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowContact(false); 
    setLoading(true);
    setMainImageIndex(0); 

    const fetchData = async () => {
      try {
        // 1. Fetch main book and show it instantly
        const bookResponse = await axios.get(`/api/books/${id}`);
        const currentBook = bookResponse.data;
        setBook(currentBook);

        setLoading(false);

        // 2. Fetch saved status and suggestions in the background
        const backgroundTasks = [];

        if (token) {
          backgroundTasks.push(
            axios.get('/api/user/saved-books', { headers: { Authorization: `Bearer ${token}` } })
              .then(res => setIsSaved(res.data.some(b => b._id === id)))
              .catch(err => console.error("Saved books error", err))
          );
        }
        
        backgroundTasks.push(
          axios.get(`/api/books`)
            .then(res => {
              const allBooks = res.data;
              const otherBooks = allBooks.filter(b => b._id !== currentBook._id);
              const sameCategory = otherBooks.filter(b => b.category === currentBook.category);
              const differentCategory = otherBooks.filter(b => b.category !== currentBook.category);
              setSuggestions([...sameCategory, ...differentCategory].slice(0, 4));
            })
            .catch(err => console.error("Suggestions error", err))
        );

        // Run both background tasks simultaneously
        await Promise.all(backgroundTasks);
        
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

      await axios.post('/api/user/save-book', 
        { bookId: id }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      setIsSaved(!isSaved);
      console.error("Failed to save book:", error);
      alert("Something went wrong while saving. Please try again.");
    }
  };

  const handlePayment = async () => {
    if (!token) {
      alert("Please log in to make a payment.");
      navigate('/login');
      return;
    }

    setPaymentLoading(true);
    
    try {
      // 1. Ask the backend to create the checkout session
      const response = await axios.post('/api/payment/create-checkout-session', {
        book: book
      });

      // 2. Stripe gives us a secure URL inside response.data.url
      const checkoutUrl = response.data.url;

      // 3. 🌟 NEW STRIPE WAY: Just redirect the browser directly!
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        alert("Failed to get checkout URL from Stripe.");
      }

    } catch (err) {
      console.error("Payment Error:", err);
      alert("Failed to initialize payment. Please try again later.");
    } finally {
      setPaymentLoading(false);
    }
  };


  if (loading) return <div className="text-center py-20 text-indigo-600 font-bold text-xl animate-pulse">Loading Book Details...</div>;
  if (!book) return <div className="text-center py-20 text-red-500 font-bold text-xl">Book not found.</div>;

  const activeImage = book.images && book.images.length > 0 
    ? book.images[mainImageIndex] 
    : (book.image || 'https://via.placeholder.com/400x600?text=No+Cover');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/" className="text-indigo-600 font-semibold hover:underline mb-6 inline-block">&larr; Back to Inventory</Link>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        <div className="md:w-1/2 bg-gray-50 p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-gray-100">
          <div className="w-full flex items-center justify-center h-[400px] mb-4">
            <img 
              src={activeImage} 
              alt={book.title} 
              className="max-w-full max-h-full object-contain drop-shadow-md transition-opacity duration-300"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/400x600?text=No+Cover' }} 
            />
          </div>

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
            <div className="flex flex-col gap-3">
              <button 
                onClick={handlePayment} 
                disabled={paymentLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-base transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {paymentLoading ? 'Redirecting to Checkout...' : `Pay securely with Stripe`}
              </button>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowContact(true)} 
                  className="flex-grow bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl text-base transition-colors shadow-sm hover:shadow-md"
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