// src/components/Quiz.tsx
import React, { useState } from 'react';

// --- Prop Types (Unchanged) ---
interface Question {
  text: string;
  options: string[];
  correctAnswerIndex: number;
}
interface Props {
  questions: Question[];
}

export default function Quiz({ questions }: Props) {
  // --- State ---
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const q = questions[currentQuestion];

  // --- Logic ---
  const handleAnswerClick = (index: number) => {
    // 1. Don't let the user change their answer
    if (answered) return;

    // 2. Set state to show the answer
    setAnswered(true);
    setSelectedAnswer(index);

    // 3. Update score
    if (index === q.correctAnswerIndex) {
      setScore(score + 1);
    }
  };

  const handleNextClick = () => {
    // 1. Check if we're at the end
    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questions.length) {
      // 2. Go to next question and reset
      setCurrentQuestion(nextQuestion);
      setAnswered(false);
      setSelectedAnswer(null);
    } else {
      // 3. Show the final score
      setShowScore(true);
    }
  };

  // --- RENDER: Final Score Screen ---
  if (showScore) {
    return (
      <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 text-center">
        <h2 className="font-title text-3xl text-white">Quiz Complete!</h2>
        <p className="text-2xl text-white mt-4">
          You scored {score} out of {questions.length}
        </p>
        <button
          onClick={() => window.location.reload()} // Reloads to get new questions
          className="
            font-bold bg-amber-500 text-neutral-900 
            px-6 py-2 rounded-lg mt-6 
            transition-transform hover:scale-105"
        >
          Try Again
        </button>
      </div>
    );
  }

  // --- RENDER: Main Quiz Screen ---
  return (
    <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800">
      {/* --- Header --- */}
      <h2 className="text-2xl text-white mb-6">
        Question {currentQuestion + 1}/{questions.length}
      </h2>
      <h3 className="text-3xl font-bold text-white mb-8">{q.text}</h3>
      
      {/* --- Answer Options --- */}
      <div className="flex flex-col gap-4">
        {q.options.map((option, index) => {
          
          // --- Dynamic Styling ---
          let buttonClass = "bg-neutral-800 border-neutral-700 hover:border-amber-500"; // Default
          
          if (answered) {
            if (index === q.correctAnswerIndex) {
              // This is the correct answer
              buttonClass = "bg-green-500/20 border-green-500";
            } else if (index === selectedAnswer) {
              // This is the (wrong) one they clicked
              buttonClass = "bg-red-500/20 border-red-500";
            } else {
              // This is an unselected, wrong answer
              buttonClass = "bg-neutral-800 border-neutral-700 opacity-50";
            }
          }
          
          return (
            <button
              key={index}
              onClick={() => handleAnswerClick(index)}
              disabled={answered} // Disable buttons after answering
              className={`
                text-left text-lg text-white p-4 
                border rounded-lg transition-all 
                ${buttonClass}
                ${!answered ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* --- Next Button --- */}
      {answered && (
        <button
          onClick={handleNextClick}
          className="
            font-bold bg-amber-500 text-neutral-900 
            px-6 py-2 rounded-lg mt-8 w-full
            transition-transform hover:scale-105"
        >
          {currentQuestion === questions.length - 1 ? 'Show Score' : 'Next Question'}
        </button>
      )}
    </div>
  );
}