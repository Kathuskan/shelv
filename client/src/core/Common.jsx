export function ErrorMessage({ children }) {
  return children ? (
    <div className="notice error" role="alert">
      {children}
    </div>
  ) : null;
}
export function Field({ title, children, ...props }) {
  return (
    <label className="field">
      <span>{title}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Loading() {
  return (
    <p className="muted" role="status">
      Loading…
    </p>
  );
}
export function AddressFields({ value, setValue, districts = [] }) {
  const set = (key, event) =>
    setValue({ ...value, [key]: event.target.value, country: "LK" });
  return (
    <div className="form-grid">
      <Field
        title="Recipient name"
        value={value.recipient || ""}
        onChange={(e) => set("recipient", e)}
        required
        maxLength={100}
        autoComplete="shipping name"
      />
      <Field
        title="Phone number"
        type="tel"
        value={value.phone || ""}
        onChange={(e) => set("phone", e)}
        required
        placeholder="0771234567"
        autoComplete="shipping tel"
      />
      <Field
        title="Street address"
        value={value.line1 || ""}
        onChange={(e) => set("line1", e)}
        required
        maxLength={180}
        autoComplete="shipping address-line1"
      />
      <Field
        title="Apartment or landmark (optional)"
        value={value.line2 || ""}
        onChange={(e) => set("line2", e)}
        maxLength={180}
        autoComplete="shipping address-line2"
      />
      <Field
        title="City or town"
        value={value.city || ""}
        onChange={(e) => set("city", e)}
        required
        maxLength={80}
        autoComplete="shipping address-level2"
      />
      <Field title="District">
        <select
          required
          value={value.district || ""}
          onChange={(e) => set("district", e)}
          autoComplete="shipping address-level1"
        >
          <option value="">Select district</option>
          {districts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </Field>
      <Field
        title="Postal code"
        value={value.postalCode || ""}
        onChange={(e) => set("postalCode", e)}
        required
        inputMode="numeric"
        pattern="[0-9]{5}"
        maxLength={5}
        autoComplete="shipping postal-code"
      />
      <Field title="Country" value="Sri Lanka" readOnly />
      <Field title="Delivery instructions (optional)">
        <textarea
          value={value.instructions || ""}
          onChange={(e) => set("instructions", e)}
          maxLength={300}
          placeholder="Anything the courier needs to know"
        />
      </Field>
    </div>
  );
}
