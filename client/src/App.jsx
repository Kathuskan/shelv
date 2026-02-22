import { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AddBook from './AddBook'; // Importing your new form!
import './App.css';

// 1. The "Home" Component (Your existing library view)
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
    <div>
      <h2>Current Inventory</h2>
      {loading ? (
        <p>Loading your library...</p>
      ) : (
        <div className="book-grid">
          {books.map((book) => (
            <div key={book._id} className="book-card">
              <h3>{book.title}</h3>
              <p><strong>Author:</strong> {book.author}</p>
              <p><strong>Type:</strong> {book.listingType} ({book.condition})</p>
              <p><strong>Price:</strong> ${book.price}</p>
              <button>
                {book.listingType === 'Rent' ? 'Rent Now' : 'Buy Now'}
              </button>
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
      <div className="container">
        
        {/* Navigation Bar: This stays on screen at all times */}
        <nav style={{ display: 'flex', gap: '20px', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #444' }}>
          <h1 style={{ margin: 0, color: '#F9F9F9' }}>📚 Shelv</h1>
          <Link to="/" style={{ textDecoration: 'none', color: '#515ADA', fontWeight: 'bold', alignSelf: 'center' }}>Home</Link>
          <Link to="/add-book" style={{ textDecoration: 'none', color: '#515ADA', fontWeight: 'bold', alignSelf: 'center' }}>+ Add Book</Link>
        </nav>

        {/* Routes: This is the dynamic area that changes based on the URL */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add-book" element={<AddBook />} />
        </Routes>
        
      </div>
    </BrowserRouter>
  );
}

export default App;