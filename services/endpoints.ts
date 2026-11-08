import api from "./api";

export const authService = {
  register: async (data: any) => {
    console.log("Registering user with data:", data);
    const response = await api.post("/auth/createuser", data);
    return response.data;
  },

  loginWithPhone: async (phone: string) => {
    const response = await api.post("/auth/loginwithphone", { phone });
    return response.data;
  },

  getUserByPhone: async (phone: string) => {
    const response = await api.post("/auth/get_user_with_phone", { phone });
    return response.data;
  },

  getProfile: async (idToken?: string) => {
    const response = await api.get(
      "/user/get_profile",
      idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : undefined,
    );
    return response.data;
  },

  updateProfile: async (data: any, idToken?: string) => {
    const response = await api.put(
      "/auth/add_profile",
      data,
      idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : undefined,
    );
    return response.data;
  },

  updateProviderProfile: async (data: any, idToken?: string) => {
    const response = await api.put(
      "/auth/add_profile/doc",
      data,
      idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : undefined,
    );
    return response.data;
  },

  verifyPhone: async (phone: string, idToken?: string) => {
    const response = await api.put(
      "/auth/verify_phone",
      { phone },
      idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : undefined,
    );
    return response.data;
  },
};

export const testService = {
  getRecommendations: async () => {
    const response = await api.get("/get_recommendations");
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get("/testlist/categories");
    return response.data;
  },

  getTests: async (categoryId?: string, page = 1, size = 10) => {
    let url = `/testlist?page=${page}&size=${size}`;
    if (categoryId) {
      url += `&catid=${categoryId}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  searchTests: async (searchTerm: string, page = 1, size = 10) => {
    const response = await api.get("/testlist/search", {
      params: { search_term: searchTerm, page, size },
    });
    return response.data;
  },

  getTest: async (testId: string | number) => {
    const response = await api.get(
      `/testlist/${encodeURIComponent(String(testId))}`,
    );
    return response.data;
  },

  getAllTestsAndCategories: async () => {
    const response = await api.get("/testlist/all");
    return response.data;
  },

  getHealthPackages: async () => {
    const response = await api.get("/healthpackages");
    return response.data;
  },
};

export const orderService = {
  initializeOrder: async (data: {
    recipient:
      | { type: "self" }
      | { type: "existing"; patient_id: number }
      | { type: "new"; patient: Record<string, unknown> };
    orderInfo: {
      service_type: string;
      clinicalinfo?: string;
      address?: string;
      addressLandmark?: string;
      referrer?: number;
      referName?: string;
    };
    testlist: { id: number }[];
    packagelist?: { id: number }[];
    channels?: ("card" | "bank" | "ussd" | "bank_transfer")[];
  }) => {
    const response = await api.post("/initialize_order", data);
    return response.data;
  },

  createOrder: async (data: any) => {
    // Assuming there's an endpoint to create an order, though not explicitly detailed in the snippet
    // Based on flow, it might be related to payment initialization or separate
    // For now, we'll assume a standard POST /orders or similar, but checking docs...
    // The docs mention "Frontend creates order and gets Paystack authorization URL" under Payments
    // Let's assume a generic endpoint for now or use the payment flow directly
    const response = await api.post("/orders", data);
    return response.data;
  },

  getOrderHistory: async (page = 1, size = 10) => {
    const response = await api.get(
      `/get_orders_history?page=${page}&size=${size}`,
    );
    return response.data;
  },

  getMyPatients: async (cursor: number | string = 1, size = 20) => {
    const response = await api.get("/get_my_patients", {
      params: { cursor, size },
    });
    return response.data;
  },

  getUserResults: async () => {
    const response = await api.get("/get_user_result");
    return response.data;
  },
};

export const paymentService = {
  initializePayment: async (data: any) => {
    // This would typically call your backend to get a Paystack auth URL or reference
    // Endpoint needs to be confirmed from full docs, but assuming standard pattern
    const response = await api.post("/payments/initialize", data);
    return response.data;
  },

  verifyPayment: async (reference: string) => {
    const response = await api.get(`/payments/verify/${reference}`);
    return response.data;
  },
};

export const walletService = {
  getCardDetails: async () => {
    const response = await api.get("/vcard/get_card_detail");
    return response.data;
  },

  activateCard: async () => {
    const response = await api.post("/vcard/activate");
    return response.data;
  },
};

export const aiService = {
  getRecommendations: async () => {
    const response = await api.get("/recommendations");
    return response.data;
  },

  chatWithBot: async (symptoms: string) => {
    const response = await api.post("/chatbot/query", {
      id: Date.now().toString(),
      text: symptoms,
      createdAt: new Date().toISOString(),
    });
    return response.data;
  },

  getChatHistory: async (limit = 30) => {
    const response = await api.get("/chatbot/history", { params: { limit } });
    return response.data;
  },

  clearChatHistory: async () => {
    const response = await api.delete("/chatbot/history");
    return response.data;
  },
};
