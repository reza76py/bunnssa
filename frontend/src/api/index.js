import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        const { data } = await axios.post(
          `${process.env.REACT_APP_API_URL || "http://localhost:8000/api"}/token/refresh/`,
          { refresh },
        );
        localStorage.setItem("access_token", data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export const storesApi = {
  list: () => api.get("/stores/"),
  create: (data) =>
    api.post("/stores/", {
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      weekly_delivery_value: data.weekly_delivery_value,
      start_date: data.start_date,
      end_date: data.end_date,
    }),
  update: (id, data) =>
    api.put(`/stores/${id}/`, {
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      weekly_delivery_value: data.weekly_delivery_value,
      start_date: data.start_date,
      end_date: data.end_date,
    }),
  remove: (id) => api.delete(`/stores/${id}/`),
};

export const supervisorsApi = {
  list: () => api.get("/supervisors/"),
  create: (data) => api.post("/supervisors/", data),
  update: (id, data) => api.put(`/supervisors/${id}/`, data),
  remove: (id) => api.delete(`/supervisors/${id}/`),
};

export const membersApi = {
  list: () => api.get("/members/"),
  create: (data) => api.post("/members/", data),
  update: (id, data) => api.put(`/members/${id}/`, data),
  remove: (id) => api.delete(`/members/${id}/`),
};

export const allocationsApi = {
  list: () => api.get("/allocations/"),
  get: (id) => api.get(`/allocations/${id}/`),
  run: (notes) => api.post("/allocations/run/", { notes }),
};

export const authApi = {
  login: (username, password) =>
    axios.post(
      `${process.env.REACT_APP_API_URL || "http://localhost:8000/api"}/token/`,
      {
        username,
        password,
      },
    ),
  register: (data) => api.post("/auth/register/", data),
  verifyEmail: (uid, token) => api.get(`/auth/verify-email/${uid}/${token}/`),
  profile: () => api.get("/auth/profile/"),
  updateProfile: (data) => api.put("/auth/profile/", data),
  requestPasswordReset: (email) => api.post("/auth/password-reset/", { email }),
  confirmPasswordReset: (uid, token, new_password, confirm_password) =>
    api.post("/auth/password-reset-confirm/", {
      uid,
      token,
      new_password,
      confirm_password,
    }),
};

export default api;
