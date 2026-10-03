// Browser smoke checks against an isolated API fixture. No real accounts, email or payments.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1365, height: 1000 },
  });
  let persona = "buyer",
    order = null,
    created = 0;
  const errors = [];
  const users = {
    buyer: {
      id: "111111111111111111111111",
      name: "Test Reader",
      email: "reader@example.test",
      role: "user",
      sellerStatus: "none",
    },
    seller: {
      id: "222222222222222222222222",
      name: "Test Bookseller",
      email: "seller@example.test",
      role: "seller",
      sellerStatus: "approved",
    },
  };
  const book = {
    _id: "333333333333333333333333",
    title: "The Secret Garden",
    author: "Frances Hodgson Burnett",
    price: 1500,
    deliveryFee: 300,
    stock: 2,
    condition: "Used",
    category: "Fiction",
    language: "English",
    description:
      "A timeless story of friendship, curiosity, and a garden coming to life.",
    dispatchFrom: "Colombo",
    conditionNotes: "Light cover wear. All pages intact.",
    images: [],
    seller: { _id: users.seller.id, name: "Test Bookseller" },
    status: "active",
    __v: 0,
  };
  const quote = {
    unitPriceMinor: 150000,
    subtotalMinor: 150000,
    deliveryMinor: 30000,
    totalMinor: 180000,
    currency: "LKR",
  };
  await context.addInitScript(() =>
    localStorage.setItem("token", "isolated-ui-test")
  );
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname,
      method = route.request().method();
    if (!path.startsWith("/api/")) {
      if (url.hostname === "127.0.0.1") return route.continue();
      return route.abort();
    }
    let data,
      status = 200;
    const body = route.request().postDataJSON();
    if (path === "/api/auth/me") data = users[persona];
    else if (path === "/api/config")
      data = {
        districts: ["Colombo", "Gampaha", "Jaffna"],
        cardPayments: true,
        currency: "LKR",
      };
    else if (path === "/api/books")
      data = {
        items: [
          book,
          {
            ...book,
            _id: "444444444444444444444444",
            title: "A Room of One’s Own",
            author: "Virginia Woolf",
            condition: "New",
          },
          {
            ...book,
            _id: "555555555555555555555555",
            title: "Pride and Prejudice",
            author: "Jane Austen",
          },
        ],
        total: 3,
        page: 1,
        pages: 1,
      };
    else if (path.startsWith("/api/books/")) data = { book, reviews: [] };
    else if (path === "/api/orders/quote") {
      assert.equal(body.quantity, 1);
      data = quote;
    } else if (path === "/api/orders" && method === "POST") {
      assert.equal(body.deliveryAddress.city, "Colombo");
      assert.equal(body.deliveryAddress.postalCode, "00100");
      assert.equal(body.paymentMethod, "cod");
      assert.equal(body.expectedTotalMinor, 180000);
      assert.ok(route.request().headers()["idempotency-key"]);
      created++;
      order = {
        _id: "666666666666666666666666",
        buyer: users.buyer.id,
        seller: users.seller.id,
        number: "SH-UI-TEST",
        item: {
          title: book.title,
          author: book.author,
          condition: book.condition,
          unitPriceMinor: 150000,
        },
        ...quote,
        quantity: 1,
        deliveryAddress: body.deliveryAddress,
        status: "placed",
        paymentMethod: "cod",
        paymentStatus: "due",
        createdAt: new Date().toISOString(),
        history: [
          {
            status: "placed",
            note: "Order created",
            at: new Date().toISOString(),
          },
        ],
      };
      data = order;
    } else if (path === "/api/orders")
      data = {
        items: order ? [order] : [],
        total: order ? 1 : 0,
        page: 1,
        pages: 1,
      };
    else if (path.endsWith("/actions")) {
      if (body.action === "dispatch") {
        assert.equal(persona, "seller");
        assert.equal(body.courier, "Test Courier");
        assert.equal(body.trackingNumber, "TRACK-123");
        order.shipping = {
          courier: body.courier,
          trackingNumber: body.trackingNumber,
          trackingUrl: body.trackingUrl,
        };
        order.status = "dispatched";
      } else if (body.action === "deliver") {
        assert.equal(persona, "buyer");
        order.status = "delivered";
      }
      order.history.push({
        status: order.status,
        note: "Order updated",
        at: new Date().toISOString(),
      });
      data = order;
    } else if (path.startsWith("/api/orders/")) data = order;
    else {
      status = 404;
      data = { message: "No fixture for " + path };
    }
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const base = process.env.UI_URL || "http://127.0.0.1:5173";
  await page.goto(base);
  await page.getByRole("heading", { name: "Fresh on the shelves" }).waitFor();
  fs.mkdirSync("/private/tmp/shelv-ui", { recursive: true });
  await page.screenshot({
    path: "/private/tmp/shelv-ui/marketplace.png",
    fullPage: true,
  });
  await page.getByRole("heading", { name: book.title, exact: true }).click();
  await page.getByRole("link", { name: "Buy this book" }).click();
  await page.getByLabel("Phone number").fill("0771234567");
  await page.getByLabel("Street address").fill("12 Test Street");
  await page.getByLabel("City or town").fill("Colombo");
  await page
    .getByRole("combobox", { name: "District", exact: true })
    .selectOption("Colombo");
  await page.getByLabel("Postal code").fill("00100");
  assert.equal(await page.getByRole("radio").count(), 2);
  await page.getByRole("button", { name: "Review total" }).click();
  await page
    .getByRole("button", { name: "Place order", exact: true })
    .waitFor();
  await page.screenshot({
    path: "/private/tmp/shelv-ui/checkout.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Place order", exact: true }).click();
  await page.getByRole("heading", { name: "Delivery address" }).waitFor();
  assert.equal(created, 1);
  assert.equal(
    await page.getByRole("button", { name: "Mark as dispatched" }).count(),
    0
  );
  persona = "seller";
  await page.goto(`${base}/orders/${order._id}`);
  await page.getByRole("heading", { name: "Dispatch this order" }).waitFor();
  await page.getByLabel("Courier company").fill("Test Courier");
  await page.getByLabel("Tracking number", { exact: true }).fill("TRACK-123");
  await page
    .getByLabel("Tracking link")
    .fill("https://example.test/tracking/TRACK-123");
  await page.getByRole("button", { name: "Mark as dispatched" }).click();
  await page.getByRole("heading", { name: "On its way to you" }).waitFor();
  assert.equal(order.status, "dispatched");
  persona = "buyer";
  await page.goto(`${base}/orders/${order._id}`);
  await page.getByRole("button", { name: "I have received my book" }).click();
  await page.getByRole("heading", { name: "How was your book?" }).waitFor();
  assert.equal(order.status, "delivered");
  assert.equal(order.paymentStatus, "due");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/private/tmp/shelv-ui/order-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    ),
    false,
    "Mobile layout must not overflow"
  );
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: catalogue, checkout address, COD placement, seller dispatch, buyer receipt, mobile layout; API fixtures only."
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
