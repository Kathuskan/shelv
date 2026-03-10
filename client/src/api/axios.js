import axios from 'axios';

const instance = axios.create({
    // Vite uses import.meta.env to read environment variables
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
});

export default instance;