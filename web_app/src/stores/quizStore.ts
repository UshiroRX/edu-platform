import { create } from "zustand";
import { persist } from "zustand/middleware";
import { quizApi } from "@/lib/api";

interface Question {
  id: string;
  question_type: "multiple_choice" | "single_choice" | "long_answer";
  question_text: string;
  points: number;
  answers: Answer[];
}

interface Answer {
  id: string;
  answer_text: string;
  is_correct: boolean;
}

interface Tag {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  is_ai_generated: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  questions: Question[];
}

interface QuizList {
  id: string;
  title: string;
  description: string;
  is_ai_generated: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  questions: Question[];
}

interface PaginatedResponse {
  items: QuizList[];
  total: number;
  limit: number;
  offset: number;
  has_next: boolean;
  has_prev: boolean;
}

interface QuizState {
  quizzes: QuizList[];
  currentQuiz: Quiz | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface QuizActions {
  // Получение квизов
  getUserQuizzes: (
    userEmail: string,
    page?: number,
    size?: number
  ) => Promise<void>;
  getQuiz: (quizId: string) => Promise<void>;
  searchQuizzes: (params: {
    q?: string;
    tags?: string[];
    user_id?: string;
    exclude_user_id?: string;
    is_ai_generated?: boolean;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    size?: number;
  }) => Promise<void>;

  // Создание и редактирование
  createQuiz: (quizData: {
    title: string;
    description: string;
    is_ai_generated: boolean;
    tags: string[];
    questions: {
      question_type: "multiple_choice" | "single_choice" | "long_answer";
      question_text: string;
      answers: {
        answer_text: string;
        is_correct: boolean;
      }[];
    }[];
  }) => Promise<void>;

  updateQuiz: (
    quizId: string,
    quizData: {
      title?: string;
      description?: string;
      is_ai_generated?: boolean;
      tags?: string[];
      questions?: {
        id?: string;
        question_type: "multiple_choice" | "single_choice" | "long_answer";
        question_text: string;
        points: number;
        answers: {
          id?: string;
          answer_text: string;
          is_correct: boolean;
        }[];
      }[];
    }
  ) => Promise<void>;

  deleteQuiz: (quizId: string) => Promise<void>;

  generateQuizWithAI: (generationData: {
    topic: string;
    difficulty?: string;
    question_count?: number;
    question_types?: string[];
    language?: string;
  }) => Promise<void>;

  // Утилиты
  clearError: () => void;
  clearCurrentQuiz: () => void;
}

type QuizStore = QuizState & QuizActions;

export const useQuizStore = create<QuizStore>()(
  persist(
    (set, get) => ({
      // State
      quizzes: [],
      currentQuiz: null,
      isLoading: false,
      error: null,
      pagination: {
        total: 0,
        has_next: false,
        has_prev: false,
      },

      // Actions
      getUserQuizzes: async (userEmail: string, page = 1, size = 10) => {
        set({ isLoading: true, error: null });

        try {
          // Используем email как user_id для поиска
          const response = await quizApi.search({
            user_email: userEmail,
            page,
            size,
          });

          set({
            quizzes: response.items,
            pagination: {
              total: response.total,
              has_next: response.has_next,
              has_prev: response.has_prev,
            },
            isLoading: false,
            error: null, // Очищаем ошибку после успешного получения
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      getQuiz: async (quizId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await quizApi.get(quizId);

          set({
            currentQuiz: response,
            isLoading: false,
            error: null, // Очищаем ошибку при успешной загрузке
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      searchQuizzes: async (params) => {
        set({ isLoading: true, error: null });

        try {
          const response = await quizApi.search(params);

          set({
            quizzes: response.items,
            pagination: {
              total: response.total,
              has_next: response.has_next,
              has_prev: response.has_prev,
            },
            isLoading: false,
            error: null, // Очищаем ошибку после успешного поиска
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      createQuiz: async (quizData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await quizApi.create(quizData);

          set({
            currentQuiz: response,
            isLoading: false,
            error: null, // Очищаем ошибку после успешного создания
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      updateQuiz: async (quizId: string, quizData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await quizApi.update(quizId, quizData);

          set({
            currentQuiz: response,
            isLoading: false,
            error: null, // Очищаем ошибку после успешного обновления
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      deleteQuiz: async (quizId: string) => {
        set({ isLoading: true, error: null });

        try {
          await quizApi.delete(quizId);

          set({
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      generateQuizWithAI: async (generationData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await quizApi.generateWithAI(generationData);

          set({
            currentQuiz: response,
            isLoading: false,
            error: null, // Очищаем ошибку после успешной генерации
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      clearCurrentQuiz: () => {
        set({ currentQuiz: null });
      },
    }),
    {
      name: "quiz-storage",
      partialize: (state) => ({
        currentQuiz: state.currentQuiz,
      }),
    }
  )
);
