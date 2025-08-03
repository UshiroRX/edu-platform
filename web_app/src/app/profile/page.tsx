"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Trophy, BookOpen, Target } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useLeaderboardStore } from "@/stores/leaderboardStore";
import { getUserIdFromToken } from "@/utils/jwt";
import { quizApi } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { current_user_rank, current_user_score, getUserScore } =
    useLeaderboardStore();

  const [stats, setStats] = useState({
    quizzesPassed: 0,
    totalPoints: 0,
    averageScore: 0,
    createdQuizzes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    // Получаем статистику пользователя
    const loadUserStats = async () => {
      const token = localStorage.getItem("auth-storage")
        ? JSON.parse(localStorage.getItem("auth-storage")!).state.accessToken
        : null;

      const userId = token ? getUserIdFromToken(token) : null;

      if (userId) {
        try {
          setIsLoading(true);

          // Получаем данные из leaderboard
          await getUserScore(userId);

          // Получаем статистику из API
          const userStats = await quizApi.getUserStats(userId);

          setStats({
            quizzesPassed: userStats.passed_quizzes || 0,
            totalPoints: current_user_score || 0,
            averageScore: userStats.average_score || 0,
            createdQuizzes: userStats.created_quizzes || 0,
          });
        } catch (error) {
          console.error("Error loading user stats:", error);
          // Используем fallback данные
          setStats({
            quizzesPassed: 0,
            totalPoints: current_user_score || 0,
            averageScore: 0,
            createdQuizzes: 0,
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadUserStats();
  }, [isAuthenticated, router, getUserScore, current_user_score]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Профиль
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.email || "Пользователь"}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Участник с {new Date().getFullYear()} года
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Квизов пройдено
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isLoading ? "..." : stats.quizzesPassed}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Всего баллов
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isLoading ? "..." : stats.totalPoints}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Target className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Средний балл
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isLoading ? "..." : `${stats.averageScore}%`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Создано квизов
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isLoading ? "..." : stats.createdQuizzes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ranking */}
        {current_user_rank && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>Позиция в рейтинге</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  #{current_user_rank}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {current_user_score} баллов
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
