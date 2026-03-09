const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');

module.exports = function(passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:5001/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // 1. Check if user already exists by their Google ID or Email
            let user = await User.findOne({ 
                $or: [
                    { googleId: profile.id },
                    { email: profile.emails[0].value }
                ] 
            });

            if (user) {
                // If they exist but don't have a googleId linked yet, link it
                if (!user.googleId) {
                    user.googleId = profile.id;
                    // Also sync their profile picture if they don't have one
                    if (!user.profilePicture) user.profilePicture = profile.photos[0].value;
                    await user.save();
                }
                return done(null, user);
            } else {
                // 2. If user doesn't exist, create a new one
                const newUser = new User({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    profilePicture: profile.photos[0].value,
                    // Since it's Google Auth, we don't need a password
                    // We can set a random one or leave it blank if your model allows
                    password: Math.random().toString(36).slice(-10) 
                });

                await newUser.save();
                return done(null, newUser);
            }
        } catch (err) {
            console.error("Passport Google Strategy Error:", err);
            return done(err, null);
        }
    }));
};