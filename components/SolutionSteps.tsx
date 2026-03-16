'use client';

import { useState } from 'react';
import { getDifficultyColor, getDifficultyText } from '@/lib/utils';

interface SolutionStepsProps {
  challenge: string;
  steps: string[];
  hints: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  code?: string;
  language?: string;
  textOutput?: string;
}

export default function SolutionSteps({
  challenge,
  steps,
  hints,
  difficulty,
  explanation,
  code,
  language,
  textOutput,
}: SolutionStepsProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'steps' | 'hints' | 'text'>(
    textOutput ? 'text' : code ? 'code' : 'steps'
  );
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-2xl font-bold text-gray-900">Solution</h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(difficulty)}`}
          >
            {getDifficultyText(difficulty)}
          </span>
        </div>
        <p className="text-gray-700 leading-relaxed">{challenge}</p>
        {explanation && (
          <p className="text-sm text-gray-600 mt-2 italic">{explanation}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-6">
        {code && (
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'code'
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            💻 Code
            {activeTab === 'code' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        )}
        {textOutput && (
          <button
            onClick={() => setActiveTab('text')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'text'
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            📝 Essay
            {activeTab === 'text' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('steps')}
          className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'steps'
            ? 'text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Steps ({steps.length})
          {activeTab === 'steps' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('hints')}
          className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'hints'
            ? 'text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Hints ({hints.length})
          {activeTab === 'hints' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'code' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                {language ? `Language: ${language}` : 'Solution Code'}
              </span>
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        ) : activeTab === 'text' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Generated Response
              </span>
            </div>
            <div className="bg-gray-50 text-gray-900 p-6 rounded-lg text-sm leading-relaxed whitespace-pre-wrap border border-gray-200">
              {textOutput}
            </div>
          </div>
        ) : activeTab === 'steps' ? (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`group flex gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${completedSteps.has(index)
                  ? 'bg-green-50 border-green-300'
                  : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                  }`}
                onClick={() => toggleStep(index)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {completedSteps.has(index) ? (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                  )}
                </div>
                <p
                  className={`flex-1 leading-relaxed ${completedSteps.has(index)
                    ? 'text-green-900 line-through'
                    : 'text-gray-800'
                    }`}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {hints.map((hint, index) => (
              <div
                key={index}
                className="flex gap-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <p className="flex-1 text-gray-800 leading-relaxed">{hint}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Completed steps: {completedSteps.size} / {steps.length}
          </span>
          <div className="flex gap-2">
            <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-300"
                style={{
                  width: `${(completedSteps.size / steps.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-gray-700 font-medium">
              {Math.round((completedSteps.size / steps.length) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
