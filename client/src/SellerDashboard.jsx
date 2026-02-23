import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import BookCard from './BookCard';

function SellerDashboard() {
    const [myBooks, setMyBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchMyBooks();
    }, []);

    const fetchMyBooks = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/seller/books', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyBooks(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching my books:", error);
            setLoading(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
        try {
            await axios.delete(`http://localhost:5001/api/seller/books/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Remove it from the screen without refreshing
            setMyBooks(myBooks.filter(book => book._id !== id));
        } catch (error) {
            alert("Failed to delete the book.");
        }
    };

    if (loading) return <div className="text-center py-20 text-indigo-600 font-bold text-xl animate-pulse">Loading Your Inventory...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* The Header Section */}
            <div className="flex justify-between items-center mb-8 border-b pb-4 border-gray-200">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">My Listings</h2>
                    <p className="text-gray-500 mt-1">Manage the books you are selling or renting.</p>
                </div>
                <Link to="/add-book" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md">
                    + Add New Book
                </Link>
            </div>

            {/* Empty State Checker */}
            {myBooks.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <p className="text-gray-500 text-lg mb-4">You haven't listed any books yet.</p>
                    <Link to="/add-book" className="text-indigo-600 font-bold hover:underline">Start selling today</Link>
                </div>
            ) : (
                /* YOUR PERFECTED GRID */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {myBooks.map((book) => (
                        <BookCard key={book._id} book={book}>
                            {/* Buttons are injected here */}
                            <Link to={`/edit-book/${book._id}`} className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-2 rounded-lg transition-colors text-sm text-center flex items-center justify-center">
                                Edit
                            </Link>
                            <button onClick={() => handleDelete(book._id, book.title)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-lg transition-colors text-sm">
                                Delete
                            </button>
                        </BookCard>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SellerDashboard;