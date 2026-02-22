import { useState } from 'react';
import axios from 'axios';

function AddBook() {
  // 1. Define the initial state matching your Mongoose Schema
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    listingType: 'Sale', // Default enum value
    condition: 'New',    // Default enum value
    price: ''
  });

  // 2. Handle input changes dynamically
  const handleChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
  };

  // 3. Handle the form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents the page from refreshing
    try {
      // Send the POST request to your backend
      const response = await axios.post('http://localhost:5001/api/books', formData);
      console.log("Success:", response.data);
      alert('📚 Book added to Shelv successfully!');
      
      // Clear the form for the next entry
      setFormData({ title: '', author: '', isbn: '', listingType: 'Sale', condition: 'New', price: '' });
    } catch (error) {
      console.error("Error adding book:", error);
      alert('Failed to add book. Please try again.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>List a Book on Shelv</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <input 
          type="text" name="title" placeholder="Book Title" 
          value={formData.title} onChange={handleChange} required 
        />
        
        <input 
          type="text" name="author" placeholder="Author Name" 
          value={formData.author} onChange={handleChange} required 
        />
        
        <input 
          type="text" name="isbn" placeholder="ISBN Number" 
          value={formData.isbn} onChange={handleChange} required 
        />
        
        <select name="listingType" value={formData.listingType} onChange={handleChange}>
          <option value="Sale">For Sale</option>
          <option value="Rent">For Rent</option>
        </select>

        <select name="condition" value={formData.condition} onChange={handleChange}>
          <option value="New">New</option>
          <option value="Used">Used</option>
        </select>
        
        <input 
          type="number" name="price" placeholder="Price ($)" min="0" step="0.01"
          value={formData.price} onChange={handleChange} required 
        />
        
        <button type="submit" style={{ backgroundColor: '#515ADA', color: 'white', padding: '10px', border: 'none', cursor: 'pointer' }}>
          Add Book
        </button>
      </form>
    </div>
  );
}

export default AddBook;