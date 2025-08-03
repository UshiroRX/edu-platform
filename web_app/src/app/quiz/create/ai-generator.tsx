"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { useQuizStore } from "@/stores/quizStore";

interface AIGeneratorProps {
  onQuizGenerated: (quiz: any) => void;
}

export default function AIGenerator({ onQuizGenerated }: AIGeneratorProps) {
  const router = useRouter();
  const { generateQuizWithAI, isLoading, error, clearError } = useQuizStore();

  const [formData, setFormData] = useState({
    topic: "",
    difficulty: "medium",
    question_count: 5,
    question_types: ["multiple_choice", "single_choice", "long_answer"],
    language: "ru",
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!formData.topic.trim()) {
      alert("Введите тему квиза");
      return;
    }

    setIsGenerating(true);

    try {
      await generateQuizWithAI(formData);
      // После успешной генерации перенаправляем на редактирование
      router.push("/dashboard");
    } catch (error) {
      console.error("Error generating quiz:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuestionTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        question_types: [...formData.question_types, type],
      });
    } else {
      setFormData({
        ...formData,
        question_types: formData.question_types.filter((t) => t !== type),
      });
    }
  };

  return (
    <Card className="border">
      <CardHeader className="text-center pb-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-10 w-10 text-gray-600" />
        </div>
        <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
          Генерация квиза с помощью ИИ
        </CardTitle>
        <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
          Создайте квиз автоматически с помощью искусственного интеллекта
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label
              htmlFor="topic"
              className="text-lg font-medium text-gray-700 dark:text-gray-300"
            >
              Тема квиза *
            </Label>
            <Input
              id="topic"
              value={formData.topic}
              onChange={(e) =>
                setFormData({ ...formData, topic: e.target.value })
              }
              placeholder="Например: История России, Математика, Программирование"
              required
              disabled={isGenerating}
              className="border focus:border-gray-900 focus:ring-gray-900 text-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Сложность
              </Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) =>
                  setFormData({ ...formData, difficulty: value })
                }
                disabled={isGenerating}
              >
                <SelectTrigger className="border focus:border-gray-900 focus:ring-gray-900">
                  <SelectValue placeholder="Выберите сложность" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">🟢 Легкий</SelectItem>
                  <SelectItem value="medium">🟡 Средний</SelectItem>
                  <SelectItem value="hard">🔴 Сложный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Количество вопросов
              </Label>
              <Select
                value={formData.question_count.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, question_count: parseInt(value) })
                }
                disabled={isGenerating}
              >
                <SelectTrigger className="border focus:border-gray-900 focus:ring-gray-900">
                  <SelectValue placeholder="Выберите количество" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 вопроса</SelectItem>
                  <SelectItem value="5">5 вопросов</SelectItem>
                  <SelectItem value="10">10 вопросов</SelectItem>
                  <SelectItem value="15">15 вопросов</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Типы вопросов
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all">
                <Checkbox
                  id="multiple_choice"
                  checked={formData.question_types.includes("multiple_choice")}
                  onCheckedChange={(checked) =>
                    handleQuestionTypeChange("multiple_choice", !!checked)
                  }
                  disabled={isGenerating}
                />
                <Label
                  htmlFor="multiple_choice"
                  className="text-lg cursor-pointer"
                >
                  🎯 Множественный выбор
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all">
                <Checkbox
                  id="single_choice"
                  checked={formData.question_types.includes("single_choice")}
                  onCheckedChange={(checked) =>
                    handleQuestionTypeChange("single_choice", !!checked)
                  }
                  disabled={isGenerating}
                />
                <Label
                  htmlFor="single_choice"
                  className="text-lg cursor-pointer"
                >
                  ⭕ Один выбор
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all">
                <Checkbox
                  id="long_answer"
                  checked={formData.question_types.includes("long_answer")}
                  onCheckedChange={(checked) =>
                    handleQuestionTypeChange("long_answer", !!checked)
                  }
                  disabled={isGenerating}
                />
                <Label htmlFor="long_answer" className="text-lg cursor-pointer">
                  ✍️ Текстовый ответ
                </Label>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isGenerating || !formData.topic.trim()}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white text-lg py-4"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Генерируем квиз...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Создать квиз с ИИ
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
