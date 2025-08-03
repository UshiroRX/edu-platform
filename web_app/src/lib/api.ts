const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const authStorage = localStorage.getItem("auth-storage");
      if (!authStorage) {
        console.log("getAuthToken - no auth storage");
        this.redirectToLogin();
        return null;
      }

      const auth = JSON.parse(authStorage);
      const token = auth.state.accessToken || null;

      if (!token) {
        console.log("getAuthToken - no access token");
        this.redirectToLogin();
        return null;
      }

      // Проверяем, что токен содержит только валидные символы
      if (typeof token === "string" && !/^[\x00-\x7F]*$/.test(token)) {
        console.log("getAuthToken - invalid token characters");
        this.redirectToLogin();
        return null;
      }

      console.log("getAuthToken - token found");
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      this.redirectToLogin();
      return null;
    }
  }

  private async refreshToken(): Promise<string | null> {
    try {
      console.log("refreshToken - starting refresh");
      const authStorage = localStorage.getItem("auth-storage");
      if (!authStorage) {
        console.log("refreshToken - did not find auth storage");
        this.redirectToLogin();
        return null;
      }

      const auth = JSON.parse(authStorage);
      const refreshToken = auth.state.refreshToken;

      if (!refreshToken) {
        console.log("refreshToken - no refresh token");
        this.redirectToLogin();
        return null;
      }

      // Проверяем, что refresh token содержит только валидные символы
      if (
        typeof refreshToken === "string" &&
        !/^[\x00-\x7F]*$/.test(refreshToken)
      ) {
        console.log("refreshToken - invalid refresh token characters");
        this.redirectToLogin();
        return null;
      }

      console.log("refreshToken - making refresh request");
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      console.log("refreshToken - response status:", response.status);

      if (!response.ok) {
        console.log("refreshToken - refresh failed");
        this.redirectToLogin();
        return null;
      }

      const data = await response.json();
      console.log("refreshToken - refresh successful");

      // Проверяем, что новые токены содержат только валидные символы
      if (
        typeof data.access_token === "string" &&
        !/^[\x00-\x7F]*$/.test(data.access_token)
      ) {
        console.log("refreshToken - invalid new access token characters");
        this.redirectToLogin();
        return null;
      }

      if (
        typeof data.refresh_token === "string" &&
        !/^[\x00-\x7F]*$/.test(data.refresh_token)
      ) {
        console.log("refreshToken - invalid new refresh token characters");
        this.redirectToLogin();
        return null;
      }

      // Обновляем токены в localStorage
      const updatedAuth = {
        ...auth,
        state: {
          ...auth.state,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        },
      };

      localStorage.setItem("auth-storage", JSON.stringify(updatedAuth));

      return data.access_token;
    } catch (error) {
      console.error("Error refreshing token:", error);
      this.redirectToLogin();
      return null;
    }
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAuthToken();
    console.log("makeRequest - endpoint:", endpoint);
    console.log("makeRequest - token exists:", !!token);

    // Фильтруем заголовки, оставляя только ASCII символы
    const cleanHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Добавляем пользовательские заголовки, фильтруя их
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === "string" && /^[\x00-\x7F]*$/.test(value)) {
          cleanHeaders[key] = value;
        }
      });
    }

    if (token) {
      cleanHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: cleanHeaders,
    });

    console.log("makeRequest - response status:", response.status);

    // Если получили 401 или нет токена, перенаправляем на логин
    if (response.status === 401 || !token) {
      console.log("makeRequest - 401 detected, attempting refresh");
      // Пробуем обновить токен только если он есть
      if (token) {
        const newToken = await this.refreshToken();
        console.log("makeRequest - refresh result:", !!newToken);
        if (newToken) {
          // Повторяем запрос с новым токеном
          cleanHeaders.Authorization = `Bearer ${newToken}`;
          const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers: cleanHeaders,
          });

          console.log(
            "makeRequest - retry response status:",
            retryResponse.status
          );

          // Если и повторный запрос не прошел, перенаправляем на логин
          if (retryResponse.status === 401) {
            console.log(
              "makeRequest - retry also failed, redirecting to login"
            );
            this.redirectToLogin();
            throw new Error("Authentication failed");
          }

          return retryResponse;
        }
      }

      // В любом случае перенаправляем на логин
      console.log("makeRequest - redirecting to login");
      this.redirectToLogin();
      throw new Error("Authentication failed");
    }

    return response;
  }

  private redirectToLogin() {
    // Удаляем токены
    localStorage.removeItem("auth-storage");
    // Перенаправляем на логин
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  }

  async get(endpoint: string): Promise<Response> {
    return this.makeRequest(endpoint, { method: "GET" });
  }

  async post(endpoint: string, data?: any): Promise<Response> {
    return this.makeRequest(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any): Promise<Response> {
    return this.makeRequest(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string): Promise<Response> {
    return this.makeRequest(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Создаем отдельный ApiClient для quiz API
export const quizApiClient = new ApiClient(API_BASE_URL);

// Добавляем методы для работы с квизами
export const quizApi = {
  async search(params: any = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    const response = await quizApiClient.get(
      `/api/quiz/search/?${searchParams.toString()}`
    );
    return response.json();
  },

  async get(quizId: string) {
    const response = await quizApiClient.get(`/api/quiz/${quizId}`);
    return response.json();
  },

  async create(quizData: any) {
    const response = await quizApiClient.post("/api/quiz/", quizData);
    return response.json();
  },

  async update(quizId: string, quizData: any) {
    const response = await quizApiClient.put(`/api/quiz/${quizId}`, quizData);
    return response.json();
  },

  async delete(quizId: string) {
    await quizApiClient.delete(`/api/quiz/${quizId}`);
  },

  async calculateResult(quizId: string, resultData: any) {
    console.log("API Client - Sending data:", resultData);
    console.log("API Client - JSON stringified:", JSON.stringify(resultData));

    const response = await quizApiClient.post(
      `/api/quiz/${quizId}/calculate-result`,
      resultData
    );
    return response.json();
  },

  async generateWithAI(generationData: {
    topic: string;
    difficulty?: string;
    question_count?: number;
    question_types?: string[];
    language?: string;
  }) {
    const response = await quizApiClient.post(
      "/api/quiz/generate-with-ai",
      generationData
    );
    return response.json();
  },
};
