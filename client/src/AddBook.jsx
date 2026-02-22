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
        <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-indigo-600 px-8 py-6">
                    <h2 className="text-2xl font-bold text-white">List a Book on Shelv</h2>
                    <p className="text-indigo-200 text-sm mt-1">Fill out the details below to add to the inventory.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Book Title</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none" placeholder="e.g. Introduction to Algorithms" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Author Name</label>
                            <input type="text" name="author" value={formData.author} onChange={handleChange} required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none" placeholder="e.g. Thomas H. Cormen" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">ISBN Number</label>
                            <input type="text" name="isbn" value={formData.isbn} onChange={handleChange} required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none" placeholder="e.g. 978-0262033848" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Listing Type</label>
                            <select name="listingType" value={formData.listingType} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none bg-white">
                                <option value="Sale">For Sale</option>
                                <option value="Rent">For Rent</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
                            <select name="condition" value={formData.condition} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none bg-white">
                                <option value="New">New</option>
                                <option value="Used">Used</option>
                            </select>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Price ($)</label>
                            <input type="number" name="price" min="0" step="0.01" value={formData.price} onChange={handleChange} required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none" placeholder="0.00" />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-gray-900 hover:bg-indigo-600 text-white font-bold py-4 px-8 rounded-xl transition-colors duration-300 mt-8 shadow-lg shadow-indigo-200">
                        Publish Listing
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AddBook;