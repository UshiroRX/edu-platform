"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BookOpen,
  Plus,
  LogOut,
  Settings,
  Bell,
  Search,
  Play,
  Edit,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useQuizStore } from "@/stores/quizStore";
import { getUserIdFromToken } from "@/utils/jwt";
import Leaderboard from "@/components/Leaderboard";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const {
    quizzes,
    pagination,
    isLoading,
    error,
    getUserQuizzes,
    searchQuizzes,
    deleteQuiz,
    clearError,
  } = useQuizStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "my" | "available" | "leaderboard"
  >("my");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user?.email) {
      if (activeTab === "my") {
        // Получаем user_id из токена для получения квизов пользователя
        const token = localStorage.getItem("auth-storage")
          ? JSON.parse(localStorage.getItem("auth-storage")!).state.accessToken
          : null;

        const userId = token ? getUserIdFromToken(token) : null;

        if (userId) {
          getUserQuizzes(userId, currentPage, 10);
        }
      } else if (activeTab === "available") {
        // Получаем user_id из токена для исключения квизов пользователя
        const token = localStorage.getItem("auth-storage")
          ? JSON.parse(localStorage.getItem("auth-storage")!).state.accessToken
          : null;

        const userId = token ? getUserIdFromToken(token) : null;

        searchQuizzes({
          page: currentPage,
          size: 10,
          exclude_user_id: userId || undefined, // Исключаем квизы пользователя
        });
      } else if (activeTab === "leaderboard") {
        // Leaderboard tab doesn't require specific user quizzes, just fetch all
        // For now, we'll fetch a small number of quizzes for the leaderboard
        // In a real app, you'd fetch all quizzes or a specific leaderboard set
        searchQuizzes({ page: 1, size: 10 });
      }
    }
  }, [user?.email, activeTab, currentPage]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const handleCreateQuiz = () => {
    router.push("/quiz/create");
  };

  const handlePlayQuiz = (quizId: string) => {
    router.push(`/quiz/${quizId}/play`);
  };

  const handleEditQuiz = (quizId: string) => {
    router.push(`/quiz/${quizId}/edit`);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm("Вы уверены, что хотите удалить этот квиз?")) {
      await deleteQuiz(quizId);
      // Перезагружаем список
      if (user?.email) {
        const token = localStorage.getItem("auth-storage")
          ? JSON.parse(localStorage.getItem("auth-storage")!).state.accessToken
          : null;

        const userId = token ? getUserIdFromToken(token) : null;

        if (userId) {
          getUserQuizzes(userId, currentPage, 10);
        }
      }
    }
  };

  const handleSearch = () => {
    if (activeTab === "available") {
      searchQuizzes({ q: searchQuery, page: 1, size: 10 });
      setCurrentPage(1);
    }
  };

  const getQuestionCount = (quiz: any) => {
    return quiz.questions?.length || 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Quizaru
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.email || "Пользователь"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/profile")}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Профиль
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Добро пожаловать в Quizaru! 👋
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Управляйте своими курсами и найдите новые для изучения
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("my")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "my"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Мои квизы
              </button>
              <button
                onClick={() => setActiveTab("available")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "available"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Доступные квизы
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "leaderboard"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Рейтинг
              </button>
            </nav>
          </div>
        </div>

        {/* Search Bar (only for available quizzes) */}
        {activeTab === "available" && (
          <div className="mb-6">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Поиск квизов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <div className="mb-6">
            <Leaderboard top={20} />
          </div>
        )}

        {/* Create Quiz Button */}
        {activeTab === "my" && (
          <div className="mb-6">
            <Button
              onClick={handleCreateQuiz}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Создать квиз</span>
            </Button>
          </div>
        )}

        {/* Quizzes Grid */}
        {(activeTab === "my" || activeTab === "available") && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse h-80">
                    <CardHeader className="pb-3">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                      <div className="h-8 bg-gray-200 rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : quizzes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map((quiz) => (
                  <Card
                    key={quiz.id}
                    className="h-80 hover:shadow-lg transition-all duration-200 hover:scale-105 border"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white break-words line-clamp-2">
                            {quiz.title}
                          </CardTitle>
                        </div>
                        {quiz.is_ai_generated && (
                          <Badge
                            variant="secondary"
                            className="ml-2 flex-shrink-0 bg-gray-100 text-gray-700 border"
                          >
                            AI
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {quiz.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 flex flex-col h-full">
                      <div className="flex-1 space-y-4">
                        {/* Tags */}
                        {quiz.tags && quiz.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {quiz.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="text-xs px-2 py-1 bg-gray-50 text-gray-700 border-gray-200"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {quiz.tags.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-1"
                              >
                                +{quiz.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{getQuestionCount(quiz)} вопросов</span>
                          </div>
                          <span className="text-xs">
                            {formatDate(quiz.created_at)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2 mt-auto">
                          {activeTab === "my" ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handlePlayQuiz(quiz.id)}
                                className="flex-1"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Пройти
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditQuiz(quiz.id)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteQuiz(quiz.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePlayQuiz(quiz.id)}
                              className="w-full"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Пройти квиз
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border">
                <CardContent className="p-16 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="h-10 w-10 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {activeTab === "my"
                      ? "У вас пока нет созданных квизов"
                      : "Пока нет доступных квизов"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {activeTab === "my"
                      ? "Создайте свой первый квиз и поделитесь знаниями с другими"
                      : "Здесь будут отображаться квизы, которые вы можете пройти"}
                  </p>
                  {activeTab === "my" && (
                    <Button
                      onClick={handleCreateQuiz}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Создать первый квиз
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {quizzes.length > 0 && (
              <div className="mt-8 flex justify-center">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!pagination.has_prev || isLoading}
                  >
                    Назад
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Страница {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination.has_next || isLoading}
                  >
                    Вперед
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
