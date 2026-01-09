import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Sparkles, AlertCircle, CheckCircle2, Clock, Zap, Lightbulb, RefreshCw, X } from 'lucide-react';
import { Card } from '../components/common';
import { useSettings } from '../hooks/useDatabase';
import { analyzeRoomOrganization, type RoomOrganizationResult } from '../utils/cognitiveAnalysis';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export function RoomOrganizerPage() {
  const settings = useSettings();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageType, setImageType] = useState<ImageMediaType>('image/jpeg');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RoomOrganizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type as ImageMediaType)) {
      setError('Please select a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 20MB for Claude API)
    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be smaller than 20MB');
      return;
    }

    setError(null);
    setResult(null);
    setCompletedSteps(new Set());
    setImageType(file.type as ImageMediaType);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      // Extract base64 data (remove the data:image/...;base64, prefix)
      const base64Data = dataUrl.split(',')[1];
      setImageBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64 || !settings?.apiKey) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await analyzeRoomOrganization(
        imageBase64,
        imageType,
        additionalContext,
        settings.apiKey
      );
      setResult(analysisResult);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    setAdditionalContext('');
    setCompletedSteps(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const toggleStepComplete = (index: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getClutterLevelColor = (level: RoomOrganizationResult['clutterLevel']) => {
    switch (level) {
      case 'minimal': return 'text-emerald-400 bg-emerald-900/30';
      case 'moderate': return 'text-amber-400 bg-amber-900/30';
      case 'significant': return 'text-orange-400 bg-orange-900/30';
      case 'overwhelming': return 'text-red-400 bg-red-900/30';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-900/30 border-red-800';
      case 'medium': return 'text-amber-400 bg-amber-900/30 border-amber-800';
      case 'low': return 'text-slate-400 bg-slate-800/50 border-slate-700';
    }
  };

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-400';
      case 'medium': return 'text-amber-400';
      case 'hard': return 'text-red-400';
    }
  };

  if (!settings?.apiKey) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">API Key Required</h2>
            <p className="text-slate-400">
              Please add your Claude API key in Settings or on the Dashboard to use the Room Organizer.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-purple-400" />
          Room Organizer
        </h1>
        <p className="text-slate-400 mt-1">
          Take a photo of any space and get AI-powered decluttering tips
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Image Capture Section */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Capture Your Space</h3>

            {!imagePreview ? (
              <div className="space-y-4">
                {/* Camera capture */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-slate-700 rounded-xl hover:border-purple-500 hover:bg-purple-900/10 transition-all flex flex-col items-center gap-3"
                >
                  <Camera className="w-10 h-10 text-purple-400" />
                  <span className="text-white font-medium">Take Photo</span>
                  <span className="text-sm text-slate-500">Use your camera to capture the space</span>
                </button>

                {/* File upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-indigo-900/10 transition-all flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-indigo-400" />
                  <span className="text-white font-medium">Upload Image</span>
                  <span className="text-sm text-slate-500">JPEG, PNG, GIF, WebP (max 20MB)</span>
                </button>

                {/* Hidden inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image preview */}
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Room preview"
                    className="w-full rounded-lg object-cover max-h-[400px]"
                  />
                  <button
                    onClick={handleReset}
                    className="absolute top-2 right-2 p-2 bg-slate-900/80 rounded-full hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Additional context */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Additional context (optional)
                  </label>
                  <textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="e.g., 'This is my home office' or 'I need help with the desk area'"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                    rows={2}
                  />
                </div>

                {/* Analyze button */}
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Analyze Space
                    </>
                  )}
                </button>

                {/* New photo button */}
                <button
                  onClick={handleReset}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Take New Photo
                </button>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-800 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Overall Assessment */}
              <Card>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getClutterLevelColor(result.clutterLevel)}`}>
                    {result.clutterLevel.charAt(0).toUpperCase() + result.clutterLevel.slice(1)} Clutter
                  </div>
                </div>
                <p className="text-slate-300">{result.overallAssessment}</p>
              </Card>

              {/* Quick Wins */}
              {result.quickWins.length > 0 && (
                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-white">Quick Wins</h3>
                    <span className="text-xs text-slate-500">Start here!</span>
                  </div>
                  <ul className="space-y-2">
                    {result.quickWins.map((win, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                        {win}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Problem Areas */}
              {result.problemAreas.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-white mb-3">Problem Areas</h3>
                  <div className="space-y-2">
                    {result.problemAreas.map((area, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${getPriorityColor(area.priority)}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{area.area}</span>
                          <span className="text-xs uppercase">{area.priority}</span>
                        </div>
                        <p className="text-sm opacity-80">{area.issue}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Action Steps */}
              {result.actionableSteps.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-white mb-3">Action Steps</h3>
                  <div className="space-y-2">
                    {result.actionableSteps.map((step, i) => (
                      <button
                        key={i}
                        onClick={() => toggleStepComplete(i)}
                        className={`w-full p-3 rounded-lg border transition-all text-left ${
                          completedSteps.has(i)
                            ? 'bg-emerald-900/30 border-emerald-800'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                            completedSteps.has(i)
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-slate-600'
                          }`}>
                            {completedSteps.has(i) && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`${completedSteps.has(i) ? 'line-through text-slate-500' : 'text-white'}`}>
                              {step.step}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-sm">
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-3 h-3" />
                                {step.timeEstimate}
                              </span>
                              <span className={getDifficultyColor(step.difficulty)}>
                                {step.difficulty}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {completedSteps.size > 0 && (
                    <div className="mt-4 p-3 bg-emerald-900/30 rounded-lg border border-emerald-800">
                      <p className="text-emerald-400 text-sm text-center">
                        Great job! You've completed {completedSteps.size} of {result.actionableSteps.length} steps!
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {/* Organization Tips */}
              {result.organizationTips.length > 0 && (
                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-semibold text-white">ADHD-Friendly Tips</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.organizationTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300">
                        <span className="text-indigo-400">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          ) : (
            <Card className="text-center py-12">
              <Camera className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">
                No analysis yet
              </h3>
              <p className="text-slate-500 text-sm">
                Take a photo of your space to get personalized organization tips
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
