import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  // 1. State: Think of this as a variable that updates the UI automatically when changed
  const [books, setBooks] = useState([]);

  // 2. Effect: This runs once when the page loads (like a constructor)
  useEffect(() => {
    axios.get('http://localhost:5001/api/books')
      .then(response => {
        console.log("Data fetched:", response.data);
        setBooks(response.data); // Update the state with data from MongoDB
      })
      .catch(error => console.error("Error fetching books:", error));
  }, []);
function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true); // New state: Start as "true"

  useEffect(() => {
    axios.get('http://localhost:5001/api/books')
      .then(response => {
        setBooks(response.data);
        setLoading(false); // Turn off loading when data arrives
      })
      .catch(error => {
        console.error("Error:", error);
        setLoading(false); // Stop loading even if there is an error
      });
  }, []);

  return (
    <div className="container">
      <h1>📚 Shelv Library</h1>
      
      {/* Conditional Rendering: Only show this if loading is true */}
      {loading ? (
        <p>Loading your library...</p>
      ) : (
        <div className="book-grid">
          {books.map((book) => (
             /* ... your existing book card code ... */
             <div key={book._id} className="book-card">
                {/* ... */}
             </div>
          ))}
        </div>
      )}
    </div>
  );
}

  return (
    <div style={{ padding: '20px' }}>
      <h1>📚 Shelv Library</h1>
      <p>Connecting React to MongoDB...</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {books.map((book) => (
          <div key={book._id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
            <h3>{book.title}</h3>
            <p><strong>Author:</strong> {book.author}</p>
            <p><strong>Price:</strong> ${book.price}</p>
            <button style={{ backgroundColor: '#515ADA', color: 'white' }}>
              {book.listingType === 'Rent' ? 'Rent Now' : 'Buy Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;