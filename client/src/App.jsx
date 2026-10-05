import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import {
  Home,
  BookPage,
  Listings,
  BookEditor,
  AdminPage,
} from "./core/Marketplace";
import {
  AuthPage,
  ProfilePage,
  SellerApplication,
  ResetPassword,
} from "./core/Account";
import { Checkout, OrderList, OrderPage } from "./core/Orders";
import useResource from "./core/useResource";
import SocialSuccess from "./SocialSuccess";
import { Loading, ErrorMessage } from "./core/Common";
function Shell() {
  const token = localStorage.getItem("token");
  const { data: user, loading, error } = useResource("/api/auth/me");
  const { data: config } = useResource("/api/config");
  const approved =
    user &&
    (user.role === "admin" ||
      (user.role === "seller" && user.sellerStatus === "approved"));
  const protect = (element) =>
    !token ? (
      <Navigate to="/login" replace />
    ) : loading ? (
      <Loading />
    ) : !user ? (
      <>
        <ErrorMessage>{error}</ErrorMessage>
        <Link to="/login">Sign in again</Link>
      </>
    ) : (
      element
    );
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.assign("/");
  }
  return (
    <>
      <header className="site-header">
        <div className="nav">
          <Link className="brand" to="/" aria-label="Shelv home">
            <svg
              className="brand-symbol"
              viewBox="305 330 645 595"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <filter id="shelv-brand-ink" colorInterpolationFilters="sRGB">
                  <feColorMatrix
                    in="SourceGraphic"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2 0 0 0 1.88"
                    result="symbolMask"
                  />
                  <feFlood floodColor="currentColor" result="brandInk" />
                  <feComposite in="brandInk" in2="symbolMask" operator="in" />
                </filter>
              </defs>
              <image
                href="/branding/shelv-symbol-shelf.png"
                width="1254"
                height="1254"
                filter="url(#shelv-brand-ink)"
              />
            </svg>
            <strong className="brand-wordmark">shelv</strong>
            <span className="brand-tagline">books find a home</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link to="/">Explore</Link>
            {token && (
              <>
                <Link to="/orders">My orders</Link>
                {approved && <Link to="/my-listings">My listings</Link>}
                {(user?.role === "seller" || user?.role === "admin") && (
                  <Link to="/seller/orders">Seller orders</Link>
                )}
                {user?.role === "admin" && <Link to="/admin">Admin</Link>}
                <Link to="/profile">Account</Link>
                <button className="text-button" onClick={logout}>
                  Sign out
                </button>
              </>
            )}
            {!token && (
              <>
                <Link to="/login">Sign in</Link>
                <Link className="button small" to="/register">
                  Join Shelv
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/book/:id" element={<BookPage user={user} />} />
          <Route path="/login" element={<AuthPage key="login" />} />
          <Route
            path="/register"
            element={<AuthPage register key="register" />}
          />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/checkout/:id"
            element={protect(<Checkout user={user} config={config} />)}
          />
          <Route path="/orders" element={protect(<OrderList />)} />
          <Route
            path="/seller/orders"
            element={protect(<OrderList seller key="seller" />)}
          />
          <Route
            path="/orders/:id"
            element={protect(<OrderPage user={user} />)}
          />
          <Route
            path="/profile"
            element={protect(<ProfilePage user={user} config={config} />)}
          />
          <Route
            path="/apply-seller"
            element={protect(<SellerApplication user={user} />)}
          />
          <Route
            path="/my-listings"
            element={protect(
              approved ? <Listings /> : <Navigate to="/apply-seller" />
            )}
          />
          <Route
            path="/add-book"
            element={protect(
              approved ? (
                <BookEditor key="new" />
              ) : (
                <Navigate to="/apply-seller" />
              )
            )}
          />
          <Route
            path="/edit-book/:id"
            element={protect(
              approved ? <BookEditor /> : <Navigate to="/apply-seller" />
            )}
          />
          <Route
            path="/admin"
            element={protect(
              user?.role === "admin" ? <AdminPage /> : <Navigate to="/" />
            )}
          />
          <Route
            path="/admin/orders"
            element={protect(
              user?.role === "admin" ? <OrderList all /> : <Navigate to="/" />
            )}
          />
          <Route path="/social-success" element={<SocialSuccess />} />
          <Route
            path="/payment-success"
            element={<Navigate to="/orders" replace />}
          />
          <Route
            path="*"
            element={
              <section className="panel">
                <h1>Page not found</h1>
                <Link to="/">Explore books</Link>
              </section>
            }
          />
        </Routes>
      </main>
      <footer className="container footer">
        A new chapter for every book.{" "}
        <span>New & pre-loved books · Delivered in Sri Lanka</span>
      </footer>
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
