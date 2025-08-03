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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { useQuizStore } from "@/stores/quizStore";
import { quizApi } from "@/lib/api";

interface Answer {
  questionId: string;
  answers: string[];
  textAnswer?: string;
}

export default function PlayQuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const { currentQuiz, getQuiz, isLoading, error } = useQuizStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<any>(null);

  useEffect(() => {
    if (quizId) {
      getQuiz(quizId);
    }
  }, [quizId]);

  useEffect(() => {
    // Инициализируем ответы для всех вопросов
    if (currentQuiz && answers.length === 0) {
      console.log("Current quiz questions:", currentQuiz.questions);
      console.log("Questions count:", currentQuiz.questions.length);
      const initialAnswers = currentQuiz.questions.map((question) => {
        console.log(
          "Question:",
          question.question_text,
          "Type:",
          question.question_type,
          "Answers count:",
          question.answers?.length || 0
        );
        return {
          questionId: question.id,
          answers: [],
          textAnswer: undefined,
        };
      });
      setAnswers(initialAnswers);
    }
  }, [currentQuiz]);

  const currentQuestion = currentQuiz?.questions[currentQuestionIndex];
  const progress = currentQuiz
    ? ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100
    : 0;

  // Отладочная информация
  useEffect(() => {
    if (currentQuestion) {
      console.log("Current question:", currentQuestion.question_text);
      console.log("Question type:", currentQuestion.question_type);
      console.log("Question answers:", currentQuestion.answers);
    }
  }, [currentQuestion]);

  // Синхронизируем textAnswer с сохраненными ответами при смене вопроса
  useEffect(() => {
    if (currentQuestion && answers.length > 0) {
      const savedAnswer = answers[currentQuestionIndex];
      if (savedAnswer && currentQuestion.question_type === "long_answer") {
        console.log(
          "Syncing textAnswer with saved answer:",
          savedAnswer.textAnswer
        );
        setTextAnswer(savedAnswer.textAnswer ?? "");
      }
    }
  }, [currentQuestionIndex, currentQuestion, answers]);

  const handleAnswerChange = (answerId: string, checked: boolean) => {
    if (currentQuestion?.question_type === "multiple_choice") {
      if (checked) {
        setSelectedAnswers([...selectedAnswers, answerId]);
      } else {
        setSelectedAnswers(selectedAnswers.filter((id) => id !== answerId));
      }
    } else if (currentQuestion?.question_type === "single_choice") {
      setSelectedAnswers([answerId]);
    }
  };

  const handleTextAnswerChange = (value: string) => {
    console.log("Text answer changed:", value);
    console.log("Previous textAnswer:", textAnswer);
    setTextAnswer(value);
    console.log("New textAnswer will be:", value);
  };

  const saveCurrentAnswer = () => {
    if (!currentQuestion) return;

    console.log("saveCurrentAnswer called");
    console.log("Current textAnswer state:", textAnswer);
    console.log("Current question type:", currentQuestion.question_type);

    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = {
      questionId: currentQuestion.id,
      answers:
        currentQuestion.question_type === "long_answer" ? [] : selectedAnswers,
      textAnswer:
        currentQuestion.question_type === "long_answer"
          ? textAnswer
          : undefined,
    };

    console.log("Saving answer for question:", currentQuestion.question_text);
    console.log("Question type:", currentQuestion.question_type);
    console.log("Text answer:", textAnswer);
    console.log("Selected answers:", selectedAnswers);
    console.log("Saved answer:", updatedAnswers[currentQuestionIndex]);

    setAnswers(updatedAnswers);
  };

  const handleNext = async () => {
    saveCurrentAnswer();

    if (currentQuestionIndex < (currentQuiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Загружаем сохраненные ответы для следующего вопроса
      const nextQuestion = currentQuiz?.questions[currentQuestionIndex + 1];
      if (nextQuestion) {
        const savedAnswer = answers[currentQuestionIndex + 1];
        console.log("Loading saved answer for next question:", savedAnswer);
        if (savedAnswer) {
          setSelectedAnswers(savedAnswer.answers);
          setTextAnswer(savedAnswer.textAnswer ?? "");
        } else {
          setSelectedAnswers([]);
          setTextAnswer("");
        }
      }
    } else {
      // Для последнего вопроса дополнительно сохраняем ответ
      if (!currentQuestion) return;

      const finalAnswers = [...answers];
      finalAnswers[currentQuestionIndex] = {
        questionId: currentQuestion.id,
        answers:
          currentQuestion.question_type === "long_answer"
            ? []
            : selectedAnswers,
        textAnswer:
          currentQuestion.question_type === "long_answer"
            ? textAnswer
            : undefined,
      };

      console.log("Final answers before sending:", finalAnswers);
      console.log("Current textAnswer:", textAnswer);
      console.log("Current question type:", currentQuestion.question_type);

      setAnswers(finalAnswers);

      // Отправляем результаты на backend
      try {
        // Преобразуем данные в формат, ожидаемый backend
        const formattedAnswers = finalAnswers.map((answer) => {
          console.log("Processing answer:", answer);
          console.log("answer.textAnswer:", answer.textAnswer);
          console.log("typeof answer.textAnswer:", typeof answer.textAnswer);

          return {
            question_id: answer.questionId,
            answers: answer.answers,
            text_answer: answer.textAnswer,
          };
        });

        console.log("Sending answers to backend:", formattedAnswers);
        console.log("Original answers:", finalAnswers);

        const result = await quizApi.calculateResult(quizId, {
          quiz_id: quizId,
          answers: formattedAnswers,
        });
        setQuizResult(result);
        setShowResults(true);
      } catch (error) {
        console.error("Error calculating result:", error);
        // Fallback к локальному подсчету
        setShowResults(true);
      }
    }
  };

  const handlePrevious = () => {
    saveCurrentAnswer();

    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Загружаем сохраненные ответы для предыдущего вопроса
      const prevQuestion = currentQuiz?.questions[currentQuestionIndex - 1];
      if (prevQuestion) {
        const savedAnswer = answers[currentQuestionIndex - 1];
        if (savedAnswer) {
          setSelectedAnswers(savedAnswer.answers);
          setTextAnswer(savedAnswer.textAnswer ?? "");
        } else {
          setSelectedAnswers([]);
          setTextAnswer("");
        }
      }
    }
  };

  const getCorrectAnswers = (question: any) => {
    return question.answers
      .filter((answer: any) => answer.is_correct)
      .map((answer: any) => answer.id);
  };

  const isAnswerCorrect = (questionId: string) => {
    const question = currentQuiz?.questions.find((q) => q.id === questionId);
    const userAnswer = answers.find((a) => a.questionId === questionId);

    if (!question || !userAnswer) return false;

    if (question.question_type === "long_answer") {
      // Для текстовых ответов просто показываем правильные ответы
      return null;
    }

    const correctAnswers = getCorrectAnswers(question);
    const userAnswers = userAnswer.answers;

    return (
      correctAnswers.length === userAnswers.length &&
      correctAnswers.every((id: string) => userAnswers.includes(id))
    );
  };

  const calculateScore = () => {
    if (!currentQuiz) return 0;

    let correctCount = 0;
    answers.forEach((answer) => {
      if (isAnswerCorrect(answer.questionId)) {
        correctCount++;
      }
    });

    return Math.round((correctCount / currentQuiz.questions.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка квиза...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.back()}>Назад</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuiz) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Квиз не найден
            </h2>
            <Button onClick={() => router.back()}>Назад</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults) {
    const score = quizResult ? quizResult.score : calculateScore();

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto py-8 max-w-4xl">
          <Card className="border">
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-gray-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                Результаты квиза
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
                {currentQuiz.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Общий результат */}
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
                    {score}%
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">🎯</span>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Правильных ответов:{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {quizResult
                      ? quizResult.correct_answers
                      : answers.filter((a) => isAnswerCorrect(a.questionId))
                          .length}
                  </span>{" "}
                  из {currentQuiz.questions.length}
                </p>
                {quizResult && (
                  <div className="mt-6 p-6 bg-gray-100 rounded-xl">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {quizResult.earned_points} / {quizResult.total_points}{" "}
                      баллов
                    </div>
                    <p className="text-gray-600">
                      Заработано баллов из возможных
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  className="border"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад к дашборду
                </Button>
                <Button
                  onClick={() => {
                    setShowResults(false);
                    setCurrentQuestionIndex(0);
                    setAnswers([]);
                    setSelectedAnswers([]);
                    setTextAnswer("");
                    setQuizResult(null);
                  }}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  Пройти еще раз
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8 max-w-4xl">
        <Card className="border">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="border"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Вопрос {currentQuestionIndex + 1} из{" "}
                  {currentQuiz.questions.length}
                </div>
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentQuiz.title}
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
              {currentQuiz.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {currentQuestion && (
              <>
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      {currentQuestion.question_text}
                    </h3>

                    {currentQuestion.question_type === "long_answer" ? (
                      <div className="space-y-3">
                        <Label className="text-lg font-medium text-gray-700 dark:text-gray-300">
                          Ваш ответ:
                        </Label>
                        <Textarea
                          value={textAnswer}
                          onChange={(e) =>
                            handleTextAnswerChange(e.target.value)
                          }
                          placeholder="Введите ваш ответ..."
                          rows={4}
                          className="border focus:border-gray-900 focus:ring-gray-900 resize-none"
                        />
                      </div>
                    ) : currentQuestion.question_type === "single_choice" ? (
                      <RadioGroup
                        value={selectedAnswers[0]}
                        onValueChange={(value) => {
                          setSelectedAnswers([value]);
                        }}
                        className="space-y-3"
                      >
                        {currentQuestion.answers.map((answer) => (
                          <div
                            key={answer.id}
                            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
                          >
                            <RadioGroupItem value={answer.id} id={answer.id} />
                            <Label
                              htmlFor={answer.id}
                              className="flex-1 cursor-pointer text-lg"
                            >
                              {answer.answer_text}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-3">
                        {currentQuestion.answers.map((answer) => (
                          <div
                            key={answer.id}
                            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
                          >
                            <Checkbox
                              id={answer.id}
                              checked={selectedAnswers.includes(answer.id)}
                              onCheckedChange={(checked) =>
                                handleAnswerChange(answer.id, !!checked)
                              }
                            />
                            <Label
                              htmlFor={answer.id}
                              className="flex-1 cursor-pointer text-lg"
                            >
                              {answer.answer_text}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="border px-6 py-3"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={
                      (currentQuestion.question_type === "multiple_choice" &&
                        selectedAnswers.length === 0) ||
                      (currentQuestion.question_type === "single_choice" &&
                        selectedAnswers.length === 0) ||
                      (currentQuestion.question_type === "long_answer" &&
                        !textAnswer.trim())
                    }
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3"
                  >
                    {currentQuestionIndex ===
                    currentQuiz.questions.length - 1 ? (
                      <>
                        Завершить
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Далее
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
