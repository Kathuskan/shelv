import { useEffect, useState } from 'react';
// 🌟 FIX 1: Import your custom axios instance, not the default one
import axios from './api/axios'; 
import { Link } from 'react-router-dom';
import BookCard from './BookCard';

function SellerDashboard() {
    const [myBooks, setMyBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        // 🌟 FIX 2: Move the function inside useEffect for better memory performance
        const fetchMyBooks = async () => {
            try {
                // 🌟 FIX 3: Remove the hardcoded localhost
                const response = await axios.get('/api/seller/books', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMyBooks(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching my books:", error);
                setLoading(false);
            }
        };

        fetchMyBooks();
    }, [token]); // 🌟 FIX 4: Add token to dependency array

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
        try {
            // 🌟 FIX 5: Remove hardcoded localhost
            await axios.delete(`/api/seller/books/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Remove it from the screen without refreshing
            setMyBooks(myBooks.filter(book => book._id !== id));
        } catch {
            alert("Failed to delete the book.");
        }
    };

    if (loading) return <div className="text-center py-20 text-indigo-600 font-bold text-xl animate-pulse">Loading Your Inventory...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8 border-b pb-4 border-gray-200">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">My Listings</h2>
                    <p className="text-gray-500 mt-1">Manage the books you are selling or renting.</p>
                </div>
            </div>

            {myBooks.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <p className="text-gray-500 text-lg mb-4">You haven't listed any books yet.</p>
                    <Link to="/add-book" className="text-indigo-600 font-bold hover:underline">Start selling today</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {myBooks.map((book) => (
                        <BookCard key={book._id} book={book}>
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