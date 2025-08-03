"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Plus, X, AlertCircle, Save, ArrowLeft } from "lucide-react";
import { useQuizStore } from "@/stores/quizStore";
import { useAuthStore } from "@/stores/authStore";

type QuestionType = "multiple_choice" | "single_choice" | "long_answer";

interface Question {
  id?: string;
  question_type: QuestionType;
  question_text: string;
  points: number;
  answers: {
    id?: string;
    answer_text: string;
    is_correct: boolean;
  }[];
}

interface FormData {
  title: string;
  description: string;
  tags: string[];
  questions: Question[];
}

export default function EditQuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;
  const { user } = useAuthStore();
  const { currentQuiz, getQuiz, updateQuiz, isLoading, error, clearError } =
    useQuizStore();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    tags: [],
    questions: [],
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

  useEffect(() => {
    if (quizId) {
      getQuiz(quizId);
    }
  }, [quizId]);

  useEffect(() => {
    if (currentQuiz) {
      setFormData({
        title: currentQuiz.title,
        description: currentQuiz.description,
        tags: currentQuiz.tags?.map((tag) => tag.name) || [],
        questions:
          currentQuiz.questions?.map((q) => ({
            id: q.id,
            question_type: q.question_type,
            question_text: q.question_text,
            points: q.points,
            answers:
              q.answers?.map((a) => ({
                id: a.id,
                answer_text: a.answer_text,
                is_correct: a.is_correct,
              })) || [],
          })) || [],
      });
    }
  }, [currentQuiz]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Очищаем ошибку перед отправкой
    clearError();

    // Подготавливаем вопросы для отправки
    const preparedQuestions = formData.questions.map((question) => ({
      ...question,
      // Для long_answer сохраняем ответы как правильные, а не удаляем их
      answers:
        question.question_type === "long_answer"
          ? question.answers.map((answer) => ({ ...answer, is_correct: true }))
          : question.answers,
    }));

    try {
      await updateQuiz(quizId, {
        title: formData.title,
        description: formData.description,
        tags: formData.tags,
        questions: preparedQuestions,
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Error updating quiz:", error);
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
        // Для текстовых вопросов делаем все ответы правильными, а не удаляем их
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

  const updateExistingQuestion = (
    questionIndex: number,
    field: string,
    value: any
  ) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      [field]: value,
    };

    // Если меняется тип вопроса на long_answer, делаем все ответы правильными
    if (field === "question_type" && value === "long_answer") {
      updatedQuestions[questionIndex].answers = updatedQuestions[
        questionIndex
      ].answers.map((answer) => ({ ...answer, is_correct: true }));
    }

    setFormData({ ...formData, questions: updatedQuestions });
  };

  const updateExistingAnswer = (
    questionIndex: number,
    answerIndex: number,
    field: string,
    value: any
  ) => {
    const updatedQuestions = [...formData.questions];
    const updatedAnswers = [...updatedQuestions[questionIndex].answers];
    updatedAnswers[answerIndex] = {
      ...updatedAnswers[answerIndex],
      [field]: value,
    };
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      answers: updatedAnswers,
    };
    setFormData({ ...formData, questions: updatedQuestions });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!currentQuiz) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Квиз не найден</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Редактировать квиз
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Внесите изменения в ваш квиз
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Основная информация */}
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
            <CardDescription>
              Измените основную информацию о квизе
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название квиза *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Введите название квиза"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Введите описание квиза"
                required
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Теги</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Добавить тег"
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTag}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTag(tag)}
                      className="ml-2 h-auto p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Существующие вопросы */}
        <Card>
          <CardHeader>
            <CardTitle>Вопросы квиза</CardTitle>
            <CardDescription>Управляйте вопросами в квизе</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.questions.map((question, questionIndex) => (
              <div
                key={questionIndex}
                className="border rounded-lg p-4 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Вопрос {questionIndex + 1}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeQuestion(questionIndex)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Тип вопроса</Label>
                    <Select
                      value={question.question_type}
                      onValueChange={(value: QuestionType) =>
                        updateExistingQuestion(
                          questionIndex,
                          "question_type",
                          value
                        )
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label>Текст вопроса *</Label>
                    <Textarea
                      value={question.question_text}
                      onChange={(e) =>
                        updateExistingQuestion(
                          questionIndex,
                          "question_text",
                          e.target.value
                        )
                      }
                      placeholder="Введите вопрос"
                      disabled={isLoading}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Баллы за вопрос</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={question.points}
                      onChange={(e) =>
                        updateExistingQuestion(
                          questionIndex,
                          "points",
                          parseInt(e.target.value) || 1
                        )
                      }
                      placeholder="1"
                      disabled={isLoading}
                    />
                  </div>

                  {(question.question_type === "multiple_choice" ||
                    question.question_type === "single_choice" ||
                    question.question_type === "long_answer") && (
                    <div className="space-y-4">
                      <Label>
                        {question.question_type === "long_answer"
                          ? "Правильные ответы"
                          : "Варианты ответов"}
                      </Label>
                      {question.answers.map((answer, answerIndex) => (
                        <div
                          key={answerIndex}
                          className="flex items-center space-x-2"
                        >
                          <Input
                            value={answer.answer_text}
                            onChange={(e) =>
                              updateExistingAnswer(
                                questionIndex,
                                answerIndex,
                                "answer_text",
                                e.target.value
                              )
                            }
                            placeholder={`Ответ ${answerIndex + 1}`}
                            disabled={isLoading}
                          />
                          {question.question_type === "single_choice" ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`correct_answer_${questionIndex}`}
                                checked={answer.is_correct}
                                onChange={() => {
                                  // Сбрасываем все ответы и устанавливаем только текущий как правильный
                                  const updatedQuestions = [
                                    ...formData.questions,
                                  ];
                                  updatedQuestions[questionIndex].answers =
                                    updatedQuestions[questionIndex].answers.map(
                                      (a, i) => ({
                                        ...a,
                                        is_correct: i === answerIndex,
                                      })
                                    );
                                  setFormData({
                                    ...formData,
                                    questions: updatedQuestions,
                                  });
                                }}
                                disabled={isLoading}
                              />
                              <Label className="text-sm">Правильный</Label>
                            </div>
                          ) : question.question_type === "long_answer" ? (
                            <div className="flex items-center space-x-2">
                              <Checkbox checked={true} disabled={true} />
                              <Label className="text-sm">
                                Всегда правильный
                              </Label>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={answer.is_correct}
                                onCheckedChange={(checked: boolean) =>
                                  updateExistingAnswer(
                                    questionIndex,
                                    answerIndex,
                                    "is_correct",
                                    !!checked
                                  )
                                }
                                disabled={isLoading}
                              />
                              <Label className="text-sm">Правильный</Label>
                            </div>
                          )}
                          {(question.question_type === "long_answer" &&
                            question.answers.length > 1) ||
                          (question.question_type !== "long_answer" &&
                            question.answers.length > 2) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updatedQuestions = [
                                  ...formData.questions,
                                ];
                                updatedQuestions[questionIndex].answers =
                                  updatedQuestions[
                                    questionIndex
                                  ].answers.filter((_, i) => i !== answerIndex);
                                setFormData({
                                  ...formData,
                                  questions: updatedQuestions,
                                });
                              }}
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updatedQuestions = [...formData.questions];
                          updatedQuestions[questionIndex].answers.push({
                            answer_text: "",
                            is_correct:
                              question.question_type === "long_answer"
                                ? true
                                : false,
                          });
                          setFormData({
                            ...formData,
                            questions: updatedQuestions,
                          });
                        }}
                        disabled={isLoading}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Добавить ответ
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Форма нового вопроса */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">Добавить новый вопрос:</h4>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Тип вопроса</Label>
                  <Select
                    value={newQuestion.question_type}
                    onValueChange={(value: QuestionType) =>
                      handleQuestionTypeChange(value)
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">
                        Множественный выбор
                      </SelectItem>
                      <SelectItem value="single_choice">Один выбор</SelectItem>
                      <SelectItem value="long_answer">
                        Текстовый ответ
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Текст вопроса *</Label>
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
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Баллы за вопрос</Label>
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
                  />
                </div>

                {(newQuestion.question_type === "multiple_choice" ||
                  newQuestion.question_type === "single_choice" ||
                  newQuestion.question_type === "long_answer") && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>
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
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Добавить ответ
                      </Button>
                    </div>

                    {newQuestion.answers.map((answer, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={answer.answer_text}
                          onChange={(e) =>
                            updateAnswer(index, "answer_text", e.target.value)
                          }
                          placeholder={`Ответ ${index + 1}`}
                          disabled={isLoading}
                        />
                        {newQuestion.question_type === "single_choice" ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="correct_answer_new"
                              checked={answer.is_correct}
                              onChange={() => {
                                // Сбрасываем все ответы и устанавливаем только текущий как правильный
                                const updatedAnswers = newQuestion.answers.map(
                                  (a, i) => ({
                                    ...a,
                                    is_correct: i === index,
                                  })
                                );
                                setNewQuestion({
                                  ...newQuestion,
                                  answers: updatedAnswers,
                                });
                              }}
                              disabled={isLoading}
                            />
                            <Label className="text-sm">Правильный</Label>
                          </div>
                        ) : newQuestion.question_type === "long_answer" ? (
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={true} disabled={true} />
                            <Label className="text-sm">Всегда правильный</Label>
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
                            <Label className="text-sm">Правильный</Label>
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
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={isLoading || formData.questions.length === 0}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "Сохранение..." : "Сохранить изменения"}
          </Button>
        </div>
      </form>
    </div>
  );
}
