"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, User } from "lucide-react";
import { useLeaderboardStore } from "@/stores/leaderboardStore";
import { getUserIdFromToken } from "@/utils/jwt";

interface LeaderboardProps {
  top?: number;
}

export default function Leaderboard({ top = 10 }: LeaderboardProps) {
  const {
    entries,
    total_users,
    current_user_rank,
    current_user_score,
    isLoading,
    error,
    getLeaderboard,
    clearError,
  } = useLeaderboardStore();

  useEffect(() => {
    getLeaderboard(top);
  }, [getLeaderboard, top]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="text-sm font-medium text-gray-500">#{rank}</span>
        );
    }
  };

  const getCurrentUserId = () => {
    const token = localStorage.getItem("auth-storage")
      ? JSON.parse(localStorage.getItem("auth-storage")!).state.accessToken
      : null;
    return token ? getUserIdFromToken(token) : null;
  };

  const currentUserId = getCurrentUserId();

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={clearError}
              className="text-blue-600 hover:text-blue-800"
            >
              Попробовать снова
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Рейтинг игроков
        </CardTitle>
        <p className="text-sm text-gray-600">Всего участников: {total_users}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(top)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-100 rounded-lg animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.user_id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  entry.user_id === currentUserId
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {entry.user_data?.email || entry.user_id}
                    </span>
                    {entry.user_id === currentUserId && (
                      <Badge variant="secondary" className="text-xs">
                        Вы
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{entry.score}</span>
                  <span className="text-sm text-gray-500">баллов</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Пока нет данных для рейтинга</p>
          </div>
        )}

        {/* Информация о текущем пользователе */}
        {current_user_rank && current_user_score && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Ваша позиция</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getRankIcon(current_user_rank)}
                <span className="font-medium">
                  {current_user_rank === 1
                    ? "1-е место"
                    : current_user_rank === 2
                    ? "2-е место"
                    : current_user_rank === 3
                    ? "3-е место"
                    : `${current_user_rank}-е место`}
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-lg">
                  {current_user_score}
                </span>
                <span className="text-sm text-gray-500 ml-1">баллов</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
