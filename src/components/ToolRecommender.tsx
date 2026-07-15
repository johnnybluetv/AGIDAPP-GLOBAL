import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Terminal, Palette, FileText, Search, Star, HelpCircle, ArrowRight, Zap, RefreshCw, Layers } from "lucide-react";
import { AiTool, Category } from "../types";
import { TranslationDict } from "../lib/translations";

interface ToolRecommenderProps {
  allTools: AiTool[];
  favorites: string[];
  comparedTools: AiTool[];
  onCompareToggle: (tool: AiTool) => void;
  onView: (tool: AiTool) => void;
  onFavoriteToggle: (tool: AiTool) => void;
  t: TranslationDict;
}

type RecommenderFocus = "code" | "creative" | "writing" | "productivity" | "all";

interface RecommendedTool extends AiTool {
  score: number;
  matchReasons: string[];
}

export default function ToolRecommender({
  allTools,
  favorites,
  comparedTools,
  onCompareToggle,
  onView,
  onFavoriteToggle,
  t
}: ToolRecommenderProps) {
  const [selectedFocus, setSelectedFocus] = React.useState<RecommenderFocus>("all");
  const [customPrompt, setCustomPrompt] = React.useState("");
  const [results, setResults] = React.useState<RecommendedTool[]>([]);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  // Focus mappings to our Category types
  const getCategoryForFocus = (focus: RecommenderFocus): Category[] => {
    switch (focus) {
      case "code":
        return ["Developer Tools"];
      case "creative":
        return ["Image & Art", "Audio & Video"];
      case "writing":
        return ["LLM & Chat"];
      case "productivity":
        return ["Productivity"];
      default:
        return ["LLM & Chat", "Image & Art", "Developer Tools", "Productivity", "Audio & Video", "Other"];
    }
  };

  const handleRecommend = () => {
    if (!customPrompt.trim() && selectedFocus === "all") {
      // If nothing selected, just show top rated tools
      const sorted = [...allTools]
        .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
        .slice(0, 3)
        .map(tool => ({
          ...tool,
          score: 90,
          matchReasons: ["Highly Upvoted", "Community Highlight"]
        }));
      setResults(sorted);
      setHasSearched(true);
      return;
    }

    setIsAnalyzing(true);
    setHasSearched(true);

    setTimeout(() => {
      const allowedCategories = getCategoryForFocus(selectedFocus);
      const promptWords = customPrompt
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 2);

      const scoredTools: RecommendedTool[] = allTools.map(tool => {
        let score = 0;
        const matchReasons: string[] = [];

        // 1. Category Matching
        if (allowedCategories.includes(tool.category)) {
          score += 40;
          matchReasons.push(`Matches your ${tool.category} focus area`);
        }

        // 2. Keyword Matching in Description, Tags, and Name
        const nameLower = tool.name.toLowerCase();
        const descLower = tool.desc.toLowerCase();
        const tagsLower = tool.tags?.map(tg => tg.toLowerCase()) || [];

        let keywordMatches = 0;
        promptWords.forEach(word => {
          if (nameLower.includes(word)) {
            score += 30;
            keywordMatches++;
          } else if (descLower.includes(word)) {
            score += 15;
            keywordMatches++;
          } else if (tagsLower.some(t => t.includes(word))) {
            score += 20;
            keywordMatches++;
          }
        });

        if (keywordMatches > 0) {
          matchReasons.push(`Matched ${keywordMatches} key terms from your query`);
        }

        // 3. Quality / Popularity Signals (Upvotes & Rating)
        const upvotesBoost = Math.min(15, (tool.upvotes || 0) / 10);
        if (upvotesBoost > 0) {
          score += upvotesBoost;
        }

        if (tool.averageRating && tool.averageRating >= 4.5) {
          score += 10;
          matchReasons.push(`Highly rated by users (${tool.averageRating}/5)`);
        }

        // Cap score at 99% unless it is an exact name match
        let finalScore = Math.min(99, Math.round(score));
        if (promptWords.some(w => nameLower === w)) {
          finalScore = 100;
          matchReasons.push(`Exact match for '${tool.name}'`);
        }

        return {
          ...tool,
          score: finalScore > 0 ? finalScore : 30 + Math.floor(Math.random() * 20), // Fallback baseline score
          matchReasons: matchReasons.length > 0 ? matchReasons : ["Fits directory profile"]
        };
      });

      // Filter and sort the recommendations
      let filtered = scoredTools;
      if (selectedFocus !== "all") {
        filtered = scoredTools.filter(t => allowedCategories.includes(t.category));
      }

      // Sort by score desc, then by upvotes desc
      const sorted = filtered
        .sort((a, b) => b.score - a.score || (b.upvotes || 0) - (a.upvotes || 0))
        .slice(0, 3);

      setResults(sorted);
      setIsAnalyzing(false);
    }, 450); // Small realistic analysis latency
  };

  const handleReset = () => {
    setSelectedFocus("all");
    setCustomPrompt("");
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div id="smart-recommender" className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-md">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -z-10" />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Input / Control Column */}
        <div className="flex-1 space-y-6 w-full text-left">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">{t.recommenderTitle}</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xl">
              {t.recommenderSubtitle}
            </p>
          </div>

          {/* Quick Focus Selectors */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Select Target Focus Area
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedFocus("code")}
                className={`py-2.5 px-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2 justify-center ${
                  selectedFocus === "code"
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                    : "bg-slate-950/40 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                {t.recommenderFocusCode}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFocus("creative")}
                className={`py-2.5 px-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2 justify-center ${
                  selectedFocus === "creative"
                    ? "bg-purple-600/20 text-purple-400 border-purple-500/30"
                    : "bg-slate-950/40 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                {t.recommenderFocusCreative}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFocus("writing")}
                className={`py-2.5 px-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2 justify-center ${
                  selectedFocus === "writing"
                    ? "bg-amber-600/20 text-amber-400 border-amber-500/30"
                    : "bg-slate-950/40 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                {t.recommenderFocusWriting}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFocus("productivity")}
                className={`py-2.5 px-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2 justify-center ${
                  selectedFocus === "productivity"
                    ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-950/40 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                {t.recommenderFocusProductivity}
              </button>
            </div>
          </div>

          {/* Natural Language Prompt */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-orange-400" />
              {t.recommenderPromptLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t.recommenderPlaceholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRecommend();
                }}
                className="w-full bg-slate-950/60 text-xs text-white border border-slate-800 rounded-2xl py-3.5 pl-4 pr-12 focus:outline-none focus:border-blue-500/50 transition-all font-semibold"
              />
              <button
                type="button"
                onClick={handleRecommend}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRecommend}
              disabled={isAnalyzing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {t.recommenderSubmit}
            </button>
            {hasSearched && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                {t.recommenderReset}
              </button>
            )}
          </div>
        </div>

        {/* Results Showcase Column */}
        <div className="w-full lg:w-[420px] bg-slate-950/30 border border-slate-850 rounded-2xl p-5 flex flex-col min-h-[280px]">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-1.5 text-left">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            {t.recommenderResultsTitle}
          </h4>

          <div className="flex-1 flex flex-col gap-3 justify-center">
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-10 space-y-3"
                >
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Filtering catalog...</span>
                </motion.div>
              ) : results.length > 0 ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3 text-left"
                >
                  {results.map((tool) => {
                    const isFav = favorites.includes(tool.id);
                    const isComp = comparedTools.some(t => t.id === tool.id);

                    return (
                      <motion.div
                        key={tool.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all space-y-2.5 relative group"
                      >
                        {/* Match Score Badge */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5">
                          <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                            {tool.score}% Match
                          </span>
                        </div>

                        <div className="space-y-1 pr-20">
                          <h5 className="font-black text-white text-sm truncate">{tool.name}</h5>
                          <span className="text-[8px] bg-slate-950 px-2 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider">
                            {tool.category}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                          {tool.desc}
                        </p>

                        {/* Match details / bullet */}
                        {tool.matchReasons && tool.matchReasons.length > 0 && (
                          <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-850/50">
                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-0.5 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-blue-400" /> Key Match:
                            </p>
                            <p className="text-[10px] font-medium text-slate-300 leading-tight">
                              {tool.matchReasons[0]}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-850">
                          {/* Rating or Upvotes */}
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                            <span className="text-[10px] font-black text-slate-300">
                              {tool.averageRating ? tool.averageRating.toFixed(1) : "5.0"}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                              ({tool.upvotes} upvotes)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onFavoriteToggle(tool)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                isFav
                                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white"
                              }`}
                              title={isFav ? "Unfavorite" : "Favorite"}
                            >
                              <Star className={`w-3 h-3 ${isFav ? "fill-rose-400" : ""}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onCompareToggle(tool)}
                              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                                isComp
                                  ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {t.compareButton}
                            </button>
                            <button
                              type="button"
                              onClick={() => onView(tool)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 space-y-3"
                >
                  <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                    {hasSearched ? t.recommenderNoResults : t.recommenderPlaceholder}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
