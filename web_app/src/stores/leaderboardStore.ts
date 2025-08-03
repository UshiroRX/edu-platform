import { create } from "zustand";
import { persist } from "zustand/middleware";
import { quizApi } from "@/lib/api";

interface UserData {
  email: string;
  name?: string;
}

interface LeaderboardEntry {
  user_id: string;
  score: number;
  rank: number;
  user_data?: UserData;
}

interface LeaderboardState {
  entries: LeaderboardEntry[];
  total_users: number;
  current_user_rank?: number;
  current_user_score?: number;
  isLoading: boolean;
  error: string | null;
}

interface LeaderboardActions {
  getLeaderboard: (top?: number) => Promise<void>;
  getUserScore: (userId: string) => Promise<void>;
  getUsersAroundUser: (userId: string, rangeSize?: number) => Promise<void>;
  updateUserScore: (
    userId: string,
    score: number,
    userData?: UserData
  ) => Promise<void>;
  removeUserFromLeaderboard: (userId: string) => Promise<void>;
  clearError: () => void;
}

type LeaderboardStore = LeaderboardState & LeaderboardActions;

export const useLeaderboardStore = create<LeaderboardStore>()(
  persist(
    (set, get) => ({
      // State
      entries: [],
      total_users: 0,
      current_user_rank: undefined,
      current_user_score: undefined,
      isLoading: false,
      error: null,

      // Actions
      getLeaderboard: async (top = 10) => {
        set({ isLoading: true, error: null });

        try {
          const response = await quizApi.getLeaderboard(top);

          set({
            entries: response.entries,
            total_users: response.total_users,
            current_user_rank: response.current_user_rank,
            current_user_score: response.current_user_score,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      getUserScore: async (userId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await quizApi.getUserScore(userId);

          set({
            current_user_score: response.score,
            current_user_rank: response.rank,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      getUsersAroundUser: async (userId: string, rangeSize = 5) => {
        set({ isLoading: true, error: null });

        try {
          const response = await quizApi.getUsersAroundUser(userId, rangeSize);

          set({
            entries: response,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      updateUserScore: async (
        userId: string,
        score: number,
        userData?: UserData
      ) => {
        set({ isLoading: true, error: null });

        try {
          await quizApi.updateUserScore(userId, score, userData);

          set({
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Произошла ошибка",
          });
        }
      },

      removeUserFromLeaderboard: async (userId: string) => {
        set({ isLoading: true, error: null });

        try {
          await quizApi.removeUserFromLeaderboard(userId);

          set({
            isLoading: false,
            error: null,
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
    }),
    {
      name: "leaderboard-storage",
      partialize: (state) => ({
        current_user_rank: state.current_user_rank,
        current_user_score: state.current_user_score,
      }),
    }
  )
);
