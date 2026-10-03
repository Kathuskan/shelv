import axios from "../api/axios";
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.skipAuth)
    config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export default axios;
export const message = (error) =>
  error.response?.data?.message || "Unable to connect. Please try again.";
export const money = (minor) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(
    (minor || 0) / 100
  );
export const label = (value) => {
  const text = (value || "").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};
export function saveSession(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  window.location.assign("/");
}
