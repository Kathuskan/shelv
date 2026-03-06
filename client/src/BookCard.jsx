import { Link } from 'react-router-dom';

function BookCard({ book, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300 w-full h-full">
      
      {/* WRAP THE TOP HALF IN A LINK */}
      <Link to={`/book/${book._id}`} className="flex-grow flex flex-col cursor-pointer">
        
        {/* 1. The Image */}
        <div className="h-64 w-full bg-gray-50 flex-shrink-0 border-b border-gray-100 p-4 flex items-center justify-center">
          <img 
            src={book.image} 
            alt={book.title} 
            className="max-w-full max-h-full object-contain drop-shadow-md"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/300x400?text=No+Cover' }} 
          />
        </div>

        {/* 2. The Text Content */}
        <div className="p-6 flex-grow flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide ${book.listingType === 'Rent' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {book.listingType}
            </span>
            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
              {book.condition}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{book.title}</h3>
          <p className="text-gray-500 text-sm mb-4">by {book.author}</p>
          
          {/* --- 🌟 ONLY THIS PRICE BLOCK WAS UPDATED 🌟 --- */}
          <div className="mt-auto pt-4 border-t border-gray-100 min-h-[4.5rem] flex flex-col justify-center">
            {book.listingType === 'Rent' ? (
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-indigo-600">Rs {book.price}.00</span>
                  <span className="text-sm font-bold text-gray-500">/ {book.rentalPeriod} days</span>
                </div>
                {book.extraDayPrice && (
                  <span className="text-xs text-gray-500 mt-1">
                    + Rs {book.extraDayPrice}.00 per extra day
                  </span>
                )}
              </div>
            ) : (
              <span className="text-2xl font-extrabold text-indigo-600">Rs {book.price}.00</span>
            )}
          </div>
          {/* ----------------------------------------------- */}
          
        </div>
      </Link>

      {/* 3. The Action Buttons (Kept OUTSIDE the Link so they don't trigger navigation!) */}
      {children && (
        <div className="px-6 pb-6 mt-auto">
          <div className="flex gap-2">
            {children}
          </div>
        </div>
      )}

    </div>
  );
}

export default BookCard;