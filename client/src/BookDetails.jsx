import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';

function BookDetails() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // NEW: State to control when to show the contact info
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/books/${id}`);
        setBook(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching book details:", error);
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  if (loading) return <div className="text-center py-20 text-indigo-600 font-bold text-xl animate-pulse">Loading Book Details...</div>;
  if (!book) return <div className="text-center py-20 text-red-500 font-bold text-xl">Book not found.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Link to="/" className="text-indigo-600 font-bold hover:underline mb-8 inline-block">&larr; Back to Inventory</Link>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Large Image */}
        <div className="md:w-1/2 bg-gray-50 p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100">
          <img 
            src={book.image} 
            alt={book.title} 
            className="max-w-full max-h-[500px] object-contain drop-shadow-xl"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/400x600?text=No+Cover' }} 
          />
        </div>

        {/* Right Side: Book Details */}
        <div className="md:w-1/2 p-8 lg:p-12 flex flex-col">
          <div className="flex gap-3 mb-6">
            <span className={`text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wide ${book.listingType === 'Rent' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              For {book.listingType}
            </span>
            <span className="text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-full">
              Condition: {book.condition}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-2 leading-tight">{book.title}</h1>
          <p className="text-xl text-gray-500 mb-6 border-b border-gray-100 pb-6">by {book.author}</p>
          
          {/* NEW: The Book Description */}
          <div className="mb-8 flex-grow">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{book.description}</p>
          </div>
          
          <div className="mb-8">
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mb-1">Asking Price</p>
            <p className="text-5xl font-extrabold text-indigo-600">Rs {book.price}.00</p>
          </div>

          {/* NEW: Dynamic Contact Reveal */}
          {showContact ? (
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 animate-fade-in">
              <p className="text-sm font-bold text-indigo-800 mb-4 uppercase tracking-wide">Seller Contact Info</p>
              
              <div className="space-y-3">
                <p className="flex items-center text-lg text-gray-900">
                  <span className="font-bold w-20">Email:</span> 
                  <a href={`mailto:${book.contactEmail}`} className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium break-all">{book.contactEmail}</a>
                </p>
                <p className="flex items-center text-lg text-gray-900">
                  <span className="font-bold w-20">Phone:</span> 
                  <a href={`tel:${book.contactPhone}`} className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium">{book.contactPhone}</a>
                </p>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowContact(true)} 
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Contact Seller
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

export default BookDetails;