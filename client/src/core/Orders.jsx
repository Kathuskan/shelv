import { useRef, useState } from "react";
import {
  Link,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api, { money, message, label } from "./api";
import useResource from "./useResource";
import { AddressFields, ErrorMessage, Field, Loading } from "./Common";
function Totals({ value }) {
  return (
    <dl className="totals">
      <div>
        <dt>Books</dt>
        <dd>{money(value.subtotalMinor)}</dd>
      </div>
      <div>
        <dt>Delivery</dt>
        <dd>{money(value.deliveryMinor)}</dd>
      </div>
      <div className="total">
        <dt>Total</dt>
        <dd>{money(value.totalMinor)}</dd>
      </div>
    </dl>
  );
}
export function Checkout({ user, config }) {
  const { id } = useParams(),
    book = useResource(`/api/books/${id}`);
  if (book.loading) return <Loading />;
  if (!book.data) return <ErrorMessage>{book.error}</ErrorMessage>;
  return (
    <CheckoutForm key={id} book={book.data.book} user={user} config={config} />
  );
}
function CheckoutForm({ book, user, config }) {
  const [address, setAddress] = useState(
      user.deliveryAddress?.line1
        ? user.deliveryAddress
        : { recipient: user.name, country: "LK" }
    ),
    [quantity, setQuantity] = useState(1),
    [payment, setPayment] = useState("cod"),
    [quote, setQuote] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saveAddress, setSaveAddress] = useState(true);
  const request = useRef(null),
    navigate = useNavigate();
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data: latest } = await api.post("/api/orders/quote", {
        bookId: book._id,
        quantity: Number(quantity),
      });
      if (!quote || quote.totalMinor !== latest.totalMinor) {
        setQuote(latest);
        return;
      }
      const body = {
          bookId: book._id,
          quantity: Number(quantity),
          deliveryAddress: address,
          paymentMethod: payment,
          saveAddress,
          expectedTotalMinor: latest.totalMinor,
        },
        fingerprint = JSON.stringify(body);
      if (!request.current || request.current.fingerprint !== fingerprint)
        request.current = { fingerprint, key: crypto.randomUUID() };
      const { data: order } = await api.post("/api/orders", body, {
        headers: { "Idempotency-Key": request.current.key },
      });
      navigate(`/orders/${order._id}`);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back" to={`/book/${book._id}`}>
        ← Back to book
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ONE STEP CLOSER TO A GOOD READ</p>
          <h1>Checkout</h1>
        </div>
        <span className="badge">Delivery within Sri Lanka</span>
      </div>
      <form className="checkout-grid" onSubmit={submit}>
        <section className="panel">
          <h2>Where should we send it?</h2>
          <AddressFields
            value={address}
            setValue={setAddress}
            districts={config?.districts}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
            />
            Save as my default address
          </label>
          <h2>How would you like to pay?</h2>
          <label
            className={`payment-choice ${payment === "cod" ? "selected" : ""}`}
          >
            <input
              type="radio"
              name="payment"
              checked={payment === "cod"}
              onChange={() => setPayment("cod")}
            />
            <span>
              <strong>Cash on delivery</strong>
              <small>Pay the courier when your book arrives.</small>
            </span>
          </label>
          <label
            className={`payment-choice ${payment === "card" ? "selected" : ""}`}
          >
            <input
              type="radio"
              name="payment"
              checked={payment === "card"}
              disabled={!config?.cardPayments}
              onChange={() => setPayment("card")}
            />
            <span>
              <strong>Credit or debit card</strong>
              <small>
                {config?.cardPayments
                  ? "Pay securely with Stripe after placing your order."
                  : "Card checkout is awaiting payment-provider setup."}
              </small>
            </span>
          </label>
        </section>
        <aside className="panel order-summary">
          <p className="eyebrow">YOUR NEXT READ</p>
          <h2>{book.title}</h2>
          <p className="muted">
            {book.author} · {book.condition}
          </p>
          <Field
            title="Copies"
            type="number"
            min={1}
            max={Math.min(book.stock, 20)}
            step={1}
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setQuote(null);
            }}
            required
          />
          <Totals
            value={
              quote || {
                subtotalMinor: book.price * 100 * Number(quantity),
                deliveryMinor: book.deliveryFee * 100,
                totalMinor:
                  (book.price * Number(quantity) + book.deliveryFee) * 100,
              }
            }
          />
          {quote && (
            <p className="notice">
              Total checked. Confirm your address and place your order.
            </p>
          )}
          <ErrorMessage>{error}</ErrorMessage>
          <button
            className="button full"
            disabled={busy || !config || !book.stock}
          >
            {busy ? "Please wait…" : quote ? "Place order" : "Review total"}
          </button>
          <p className="small-copy muted">
            The seller will add courier details once dispatched. You can cancel
            before dispatch.
          </p>
        </aside>
      </form>
    </>
  );
}
export function OrderList({ seller = false, all = false }) {
  const [params, setParams] = useSearchParams(),
    page = Number(params.get("page") || 1),
    view = all ? "all" : seller ? "seller" : "buyer",
    resource = useResource(`/api/orders?view=${view}&page=${page}`, 30000);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {seller ? "SELLER STUDIO" : all ? "ADMINISTRATION" : "YOUR SHELV"}
          </p>
          <h1>
            {seller ? "Orders to fulfil" : all ? "All orders" : "Your orders"}
          </h1>
        </div>
        <Link className="button secondary" to={seller ? "/my-listings" : "/"}>
          {seller ? "My listings" : "Explore books"}
        </Link>
      </div>
      <ErrorMessage>{resource.error}</ErrorMessage>
      {resource.loading ? (
        <Loading />
      ) : resource.data?.items.length ? (
        <div>
          {resource.data.items.map((order) => (
            <Link
              className="panel order-row"
              key={order._id}
              to={`/orders/${order._id}`}
            >
              <div>
                <p className="eyebrow">
                  {order.number} ·{" "}
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
                <h3>{order.item.title}</h3>
                <p className="muted">
                  {order.quantity} copies · {order.deliveryAddress.city},{" "}
                  {order.deliveryAddress.district}
                </p>
              </div>
              <div className="order-meta">
                <span className={`badge status-${order.status}`}>
                  {label(order.status)}
                </span>
                <strong>{money(order.totalMinor)}</strong>
                <small>
                  {order.paymentMethod === "cod" ? "Cash on delivery" : "Card"}{" "}
                  · {label(order.paymentStatus)}
                </small>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>No orders yet</h2>
          <p>
            {seller
              ? "Your next sale will appear here."
              : "Find a book you’ll love and give it a home."}
          </p>
        </div>
      )}
      <div className="pagination">
        <button
          disabled={page <= 1}
          onClick={() => setParams({ page: String(page - 1) })}
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.max(1, resource.data?.pages || 1)}
        </span>
        <button
          disabled={!resource.data || page >= resource.data.pages}
          onClick={() => setParams({ page: String(page + 1) })}
        >
          Next
        </button>
      </div>
    </>
  );
}
export function OrderPage({ user }) {
  const { id } = useParams(),
    {
      data: order,
      error,
      loading,
      reload,
    } = useResource(`/api/orders/${id}`, 10000),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function action(input) {
    setBusy(true);
    setActionError("");
    try {
      await api.post(`/api/orders/${id}/actions`, input);
      reload();
      setNotice("Order updated.");
    } catch (e) {
      setActionError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    setBusy(true);
    setActionError("");
    try {
      const { data } = await api.post(`/api/orders/${id}/pay`);
      if (data.url) window.location.assign(data.url);
      else reload();
    } catch (e) {
      setActionError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function review(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(
        `/api/orders/${id}/reviews`,
        Object.fromEntries(new FormData(e.currentTarget))
      );
      setNotice("Thank you for your review.");
      reload();
    } catch (err) {
      setActionError(message(err));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (!order) return <ErrorMessage>{error}</ErrorMessage>;
  const buyer = order.buyer === user.id,
    seller = order.seller === user.id,
    admin = user.role === "admin",
    ready = ["placed", "confirmed"].includes(order.status),
    address = order.deliveryAddress;
  return (
    <>
      <Link className="back" to={seller ? "/seller/orders" : "/orders"}>
        ← Orders
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{order.number}</p>
          <h1>{label(order.status)}</h1>
          <p className="muted">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="badge">
          {order.paymentMethod === "cod" ? "Cash on delivery" : "Card"} ·{" "}
          {label(order.paymentStatus)}
        </span>
      </div>
      <ErrorMessage>{error || actionError}</ErrorMessage>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="checkout-grid">
        <div>
          <section className="panel">
            <h2>Delivery address</h2>
            <address>
              <strong>{address.recipient}</strong>
              <br />
              {address.line1}
              <br />
              {address.line2 && (
                <>
                  {address.line2}
                  <br />
                </>
              )}
              {address.city}, {address.district} {address.postalCode}
              <br />
              Sri Lanka
              <br />
              <a href={`tel:${address.phone}`}>{address.phone}</a>
            </address>
            {address.instructions && (
              <p className="notice">
                Delivery instructions: {address.instructions}
              </p>
            )}
          </section>
          {order.shipping?.trackingNumber && (
            <section className="panel">
              <h2>
                {order.status === "delivered"
                  ? "Shipment details"
                  : "On its way to you"}
              </h2>
              <p>
                <strong>{order.shipping.courier}</strong>
              </p>
              <p>Tracking number: {order.shipping.trackingNumber}</p>
              {order.shipping.trackingUrl && (
                <a
                  className="button secondary"
                  href={order.shipping.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Track delivery ↗
                </a>
              )}
            </section>
          )}
          <section className="panel">
            <h2>Order progress</h2>
            <ol className="timeline">
              {order.history.map((event, index) => (
                <li key={index}>
                  <strong>{label(event.status)}</strong>
                  <p>{event.note}</p>
                  <small className="muted">
                    {new Date(event.at).toLocaleString()}
                  </small>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside>
          <section className="panel">
            <p className="eyebrow">ORDER SUMMARY</p>
            <h2>{order.item.title}</h2>
            <p>
              {order.item.author} · {order.item.condition}
            </p>
            <p>
              {order.quantity} × {money(order.item.unitPriceMinor)}
            </p>
            <Totals value={order} />
            {order.paymentStatus === "refund_pending" && (
              <p className="notice">
                A refund is pending. The payment status will update after
                confirmation.
              </p>
            )}
            {order.paymentMethod === "cod" && order.paymentStatus === "due" && (
              <p className="muted">
                Payment is due on delivery. The seller records cash collection
                separately.
              </p>
            )}
            {buyer && order.status === "awaiting_payment" && (
              <>
                <p className="notice">
                  Stock reserved until{" "}
                  {new Date(order.expiresAt).toLocaleTimeString()}. Card payment
                  must be confirmed before dispatch. If you just paid, this page
                  will update automatically.
                </p>
                <button className="button full" disabled={busy} onClick={pay}>
                  Continue to card payment
                </button>
              </>
            )}
            {(seller || admin) && order.status === "placed" && (
              <button
                className="button"
                disabled={busy}
                onClick={() => action({ action: "confirm" })}
              >
                Confirm & prepare
              </button>
            )}
            {buyer && order.status === "dispatched" && (
              <button
                className="button"
                disabled={busy}
                onClick={() => action({ action: "deliver" })}
              >
                I have received my book
              </button>
            )}
            {(seller || admin) &&
              order.status === "delivered" &&
              order.paymentMethod === "cod" &&
              order.paymentStatus === "due" && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Confirm that cash has been collected?"))
                      action({ action: "collect" });
                  }}
                >
                  Confirm cash collected
                </button>
              )}
          </section>
        </aside>
      </div>
      {(seller || admin) && ready && (
        <section className="panel">
          <h2>Dispatch this order</h2>
          <p className="muted">
            Arrange delivery to the address above. Add shipment details after
            handing the parcel to your courier.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action({
                action: "dispatch",
                ...Object.fromEntries(new FormData(e.currentTarget)),
              });
            }}
          >
            <div className="form-grid">
              <Field
                title="Courier company"
                name="courier"
                required
                maxLength={80}
              />
              <Field
                title="Tracking number"
                name="trackingNumber"
                required
                maxLength={100}
              />
              <Field
                title="Tracking link (optional, HTTPS)"
                name="trackingUrl"
                type="url"
                maxLength={500}
              />
            </div>
            <button className="button" disabled={busy}>
              Mark as dispatched
            </button>
          </form>
        </section>
      )}
      {["awaiting_payment", "placed", "confirmed"].includes(order.status) && (
        <ActionForm
          title="Cancel order"
          action="cancel"
          button="Cancel this order"
          busy={busy}
          onSubmit={action}
        />
      )}
      {buyer && ["dispatched", "delivered"].includes(order.status) && (
        <ActionForm
          title="Report a delivery or book issue"
          action="dispute"
          button="Report issue"
          busy={busy}
          onSubmit={action}
        />
      )}
      {admin && order.status === "disputed" && (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            action({
              ...data,
              action: "resolve",
              restock: data.restock === "on",
            });
          }}
        >
          <h2>Resolve issue</h2>
          <Field title="Resolution">
            <select name="resolution">
              <option value="delivered">Delivered — close issue</option>
              <option value="returned">
                Returned — refund received payment
              </option>
            </select>
          </Field>
          <Field
            title="Resolution details"
            name="reason"
            required
            maxLength={500}
          />
          <label className="check">
            <input name="restock" type="checkbox" />
            Returned copy is safe to restock
          </label>
          <button className="button" disabled={busy}>
            Save resolution
          </button>
        </form>
      )}
      {admin &&
        order.paymentMethod === "cod" &&
        order.paymentStatus === "refund_pending" && (
          <ActionForm
            title="Record cash refund"
            action="record-cash-refund"
            button="Confirm cash refund completed"
            busy={busy}
            onSubmit={action}
          />
        )}
      {buyer && order.status === "delivered" && !order.reviewed && (
        <form className="panel" onSubmit={review}>
          <h2>How was your book?</h2>
          <Field title="Rating">
            <select name="rating">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} out of 5
                </option>
              ))}
            </select>
          </Field>
          <Field title="Your review">
            <textarea name="comment" required maxLength={1500} />
          </Field>
          <button className="button" disabled={busy}>
            Publish verified review
          </button>
        </form>
      )}
    </>
  );
}
function ActionForm({ title, action, button, busy, onSubmit }) {
  return (
    <details className="panel">
      <summary>{title}</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ action, reason: e.currentTarget.elements.reason.value });
        }}
      >
        <Field title="Reason or reference">
          <textarea name="reason" required maxLength={500} />
        </Field>
        <button disabled={busy} className="button secondary">
          {button}
        </button>
      </form>
    </details>
  );
}
