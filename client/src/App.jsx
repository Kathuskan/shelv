import { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AddBook from './AddBook'; 
// Note: We removed import './App.css' because Tailwind handles all our styling now!

// 1. The "Home" Component (Now styled with Tailwind)
function Home() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5001/api/books')
      .then(response => {
        setBooks(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching books:", error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Current Inventory</h2>
        <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
          {books.length} Books Available
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {books.map((book) => (
            <div key={book._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="flex-grow">
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
              </div>
              
              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-extrabold text-indigo-600">${book.price}</span>
                  <button className="bg-gray-900 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                    {book.listingType === 'Rent' ? 'Rent' : 'Buy'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 2. The Main App Component with Routing
function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        
        {/* Tailwind Navigation Bar */}
        <nav className="flex items-center justify-between bg-white shadow-md px-8 py-4 mb-8 border-b border-gray-200">
          <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">📚 Shelv</h1>
          <div className="flex gap-6">
            <Link to="/" className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors flex items-center">Home</Link>
            <Link to="/add-book" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg">+ Add Book</Link>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add-book" element={<AddBook />} /> {/* Don't forget to update your AddBook.jsx file with the Tailwind code I gave earlier too! */}
        </Routes>
        
      </div>
    </BrowserRouter>
  );
}

export default App;