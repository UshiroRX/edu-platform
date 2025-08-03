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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, AlertCircle } from "lucide-react";
import { useQuizStore } from "@/stores/quizStore";
import { useAuthStore } from "@/stores/authStore";
import AIGenerator from "./ai-generator";

type QuestionType = "multiple_choice" | "single_choice" | "long_answer";

interface Question {
  question_type: QuestionType;
  question_text: string;
  points: number;
  answers: {
    answer_text: string;
    is_correct: boolean;
  }[];
}

export default function CreateQuizPage() {
  const router = useRouter();
  const { createQuiz, isLoading, error, clearError } = useQuizStore();
  const { user } = useAuthStore();

  const [creationMode, setCreationMode] = useState<"manual" | "ai">("manual");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_ai_generated: false,
    tags: [] as string[],
    questions: [] as Question[],
  });

  const [newTag, setNewTag] = useState("");
  const [newQuestion, setNewQuestion] = useState<Question>({
    question_type: "multiple_choice",
    question_text: "",
    points: 1,
    answers: [
      { answer_text: "", is_correct: false },
      { answer_text: "", is_correct: false },
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!user?.email) {
      alert("Пользователь не авторизован");
      return;
    }

    if (formData.questions.length === 0) {
      alert("Добавьте хотя бы один вопрос");
      return;
    }

    try {
      await createQuiz({
        ...formData,
        questions: formData.questions,
      });
      router.push("/dashboard");
    } catch (error) {
      // Ошибка уже обработана в store
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const addQuestion = () => {
    if (newQuestion.question_text.trim()) {
      // Для long_answer не требуется минимум ответов, для остальных - минимум 2
      const hasEnoughAnswers =
        newQuestion.question_type === "long_answer"
          ? true
          : newQuestion.answers.length >= 2;

      if (hasEnoughAnswers) {
        // Для текстовых вопросов делаем все ответы правильными
        const questionToAdd =
          newQuestion.question_type === "long_answer"
            ? {
                ...newQuestion,
                answers: newQuestion.answers.map((answer) => ({
                  ...answer,
                  is_correct: true,
                })),
              }
            : newQuestion;

        setFormData({
          ...formData,
          questions: [...formData.questions, questionToAdd],
        });
        setNewQuestion({
          question_type: "multiple_choice",
          question_text: "",
          points: 1,
          answers: [
            { answer_text: "", is_correct: false },
            { answer_text: "", is_correct: false },
          ],
        });
      }
    }
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  const addAnswer = () => {
    setNewQuestion({
      ...newQuestion,
      answers: [
        ...newQuestion.answers,
        {
          answer_text: "",
          is_correct:
            newQuestion.question_type === "long_answer" ? true : false,
        },
      ],
    });
  };

  const removeAnswer = (index: number) => {
    if (newQuestion.answers.length > 2) {
      setNewQuestion({
        ...newQuestion,
        answers: newQuestion.answers.filter((_, i) => i !== index),
      });
    }
  };

  const updateAnswer = (
    index: number,
    field: "answer_text" | "is_correct",
    value: string | boolean
  ) => {
    const updatedAnswers = [...newQuestion.answers];
    updatedAnswers[index] = { ...updatedAnswers[index], [field]: value };
    setNewQuestion({ ...newQuestion, answers: updatedAnswers });
  };

  const handleQuestionTypeChange = (type: QuestionType) => {
    setNewQuestion({
      ...newQuestion,
      question_type: type,
      // Для long_answer добавляем хотя бы один ответ, если их нет
      answers:
        type === "long_answer" && newQuestion.answers.length === 0
          ? [{ answer_text: "", is_correct: true }]
          : newQuestion.answers,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Создать новый квиз
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Создайте увлекательный квиз для проверки знаний
          </p>
        </div>

        {/* Переключатель режимов */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 border">
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={() => setCreationMode("manual")}
                className={`flex-1 py-3 px-6 rounded-md text-sm font-medium transition-all duration-200 ${
                  creationMode === "manual"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                ✏️ Ручное создание
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("ai")}
                className={`flex-1 py-3 px-6 rounded-md text-sm font-medium transition-all duration-200 ${
                  creationMode === "ai"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                🤖 Генерация с ИИ
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {creationMode === "ai" ? (
          <AIGenerator
            onQuizGenerated={(quiz) => {
              // После генерации переключаемся на ручной режим для редактирования
              setCreationMode("manual");
            }}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Основная информация */}
            <Card className="border">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  📝 Основная информация
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
                  Заполните основную информацию о квизе
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="title"
                    className="text-lg font-medium text-gray-700 dark:text-gray-300"
                  >
                    Название квиза *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Введите название квиза"
                    required
                    disabled={isLoading}
                    className="border focus:border-gray-900 focus:ring-gray-900 text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="description"
                    className="text-lg font-medium text-gray-700 dark:text-gray-300"
                  >
                    Описание *
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Опишите, о чем этот квиз"
                    required
                    disabled={isLoading}
                    rows={4}
                    className="border focus:border-gray-900 focus:ring-gray-900 resize-none"
                  />
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="ai_generated"
                    checked={formData.is_ai_generated}
                    onCheckedChange={(checked: boolean) =>
                      setFormData({ ...formData, is_ai_generated: !!checked })
                    }
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="ai_generated"
                    className="text-lg cursor-pointer"
                  >
                    🤖 Создан с помощью ИИ
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Теги */}
            <Card className="border">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  🏷️ Теги
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
                  Добавьте теги для лучшей категоризации
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex space-x-3">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Введите тег"
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addTag())
                    }
                    disabled={isLoading}
                    className="border focus:border-gray-900 focus:ring-gray-900"
                  />
                  <Button
                    type="button"
                    onClick={addTag}
                    disabled={isLoading}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {formData.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 border"
                      >
                        <span className="text-lg">🏷️</span>
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Вопросы */}
            <Card className="border">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  🎯 Вопросы
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
                  Добавьте вопросы для вашего квиза
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Список добавленных вопросов */}
                {formData.questions.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-xl text-gray-900 dark:text-white">
                      Добавленные вопросы:
                    </h4>
                    {formData.questions.map((question, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-lg text-gray-900 dark:text-white">
                            Вопрос {index + 1}: {question.question_text}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeQuestion(index)}
                            disabled={isLoading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Тип:{" "}
                          {question.question_type === "multiple_choice"
                            ? "Множественный выбор"
                            : question.question_type === "single_choice"
                            ? "Один выбор"
                            : "Текстовый ответ"}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Ответов: {question.answers.length}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Форма нового вопроса */}
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4 text-xl text-gray-900 dark:text-white">
                    Добавить новый вопрос:
                  </h4>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        Тип вопроса
                      </Label>
                      <Select
                        value={newQuestion.question_type}
                        onValueChange={handleQuestionTypeChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="border focus:border-gray-900 focus:ring-gray-900">
                          <SelectValue placeholder="Выберите тип вопроса" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">
                            Множественный выбор
                          </SelectItem>
                          <SelectItem value="single_choice">
                            Один выбор
                          </SelectItem>
                          <SelectItem value="long_answer">
                            Текстовый ответ
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        Текст вопроса *
                      </Label>
                      <Textarea
                        value={newQuestion.question_text}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            question_text: e.target.value,
                          })
                        }
                        placeholder="Введите вопрос"
                        disabled={isLoading}
                        rows={3}
                        className="border focus:border-gray-900 focus:ring-gray-900"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        Баллы за вопрос
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={newQuestion.points}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            points: parseInt(e.target.value) || 1,
                          })
                        }
                        placeholder="1"
                        disabled={isLoading}
                        className="border focus:border-gray-900 focus:ring-gray-900"
                      />
                    </div>

                    {(newQuestion.question_type === "multiple_choice" ||
                      newQuestion.question_type === "single_choice" ||
                      newQuestion.question_type === "long_answer") && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            {newQuestion.question_type === "long_answer"
                              ? "Правильные ответы"
                              : "Варианты ответов"}
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addAnswer}
                            disabled={isLoading}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Добавить ответ
                          </Button>
                        </div>

                        {newQuestion.answers.map((answer, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2"
                          >
                            <Input
                              value={answer.answer_text}
                              onChange={(e) =>
                                updateAnswer(
                                  index,
                                  "answer_text",
                                  e.target.value
                                )
                              }
                              placeholder={`Ответ ${index + 1}`}
                              disabled={isLoading}
                              className="border focus:border-gray-900 focus:ring-gray-900"
                            />
                            {newQuestion.question_type === "single_choice" ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name="correct_answer_new"
                                  checked={answer.is_correct}
                                  onChange={() => {
                                    // Сбрасываем все ответы и устанавливаем только текущий как правильный
                                    const updatedAnswers =
                                      newQuestion.answers.map((a, i) => ({
                                        ...a,
                                        is_correct: i === index,
                                      }));
                                    setNewQuestion({
                                      ...newQuestion,
                                      answers: updatedAnswers,
                                    });
                                  }}
                                  disabled={isLoading}
                                />
                                <Label className="text-lg cursor-pointer">
                                  Правильный
                                </Label>
                              </div>
                            ) : newQuestion.question_type === "long_answer" ? (
                              <div className="flex items-center space-x-2">
                                <Checkbox checked={true} disabled={true} />
                                <Label className="text-lg cursor-pointer">
                                  Всегда правильный
                                </Label>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={answer.is_correct}
                                  onCheckedChange={(checked: boolean) =>
                                    updateAnswer(index, "is_correct", !!checked)
                                  }
                                  disabled={isLoading}
                                />
                                <Label className="text-lg cursor-pointer">
                                  Правильный
                                </Label>
                              </div>
                            )}
                            {(newQuestion.question_type === "long_answer" &&
                              newQuestion.answers.length > 1) ||
                            (newQuestion.question_type !== "long_answer" &&
                              newQuestion.answers.length > 2) ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeAnswer(index)}
                                disabled={isLoading}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={addQuestion}
                      disabled={
                        isLoading ||
                        !newQuestion.question_text.trim() ||
                        (newQuestion.question_type !== "long_answer" &&
                          newQuestion.answers.length < 2)
                      }
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить вопрос
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Кнопки действий */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="border"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isLoading || formData.questions.length === 0}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isLoading ? "Создание..." : "Создать квиз"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
