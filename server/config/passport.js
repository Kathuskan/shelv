const { Passport } = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");
module.exports = function googlePassport() {
  const passport = new Passport();
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${
          process.env.BACKEND_URL || "http://localhost:5001"
        }/api/auth/google/callback`,
      },
      async (_access, _refresh, profile, done) => {
        try {
          if (!profile._json?.email_verified) return done(null, false);
          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            if (!email) return done(null, false);
            // Existing password accounts must sign in normally; never silently link an identity.
            if (await User.exists({ email })) return done(null, false);
            user = await User.create({
              googleId: profile.id,
              email,
              name: profile.displayName,
              profilePicture: profile.photos?.[0]?.value || "",
              emailVerifiedAt: new Date(),
            });
          }
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
  return passport;
};
