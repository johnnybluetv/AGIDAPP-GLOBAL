import React from "react";
import { motion } from "motion/react";
import { Sparkles, Star, Zap, Flame, Award, HeartHandshake } from "lucide-react";
import { AiTool } from "../types";
import ToolCard from "./ToolCard";

interface RecommendedForYouProps {
  allTools: AiTool[];
  favorites: string[];
  comparedTools: AiTool[];
  onCompareToggle: (tool: AiTool) => void;
  onView: (tool: AiTool) => void;
  onEdit?: (tool: AiTool) => void;
  onDelete?: (tool: AiTool) => void;
  onShare: (tool: AiTool) => void;
  isAdmin: boolean;
}

interface ScoredRecommendation extends AiTool {
  recommendationScore: number;
  recommendationReason: string;
}

export default function RecommendedForYou({
  allTools,
  favorites,
  comparedTools,
  onCompareToggle,
  onView,
  onEdit,
  onDelete,
  onShare,
  isAdmin
}: RecommendedForYouProps) {
  
  const recommendations = React.useMemo(() => {
    if (!allTools || allTools.length === 0) return [];

    // Filter out tools that are already favorited
    const unfavoritedTools = allTools.filter(tool => !favorites.includes(tool.id));

    // Find favorited tools to extract user interests
    const favoritedTools = allTools.filter(tool => favorites.includes(tool.id));
    const favoriteCategories = favoritedTools.map(t => t.category);
    const favoriteTags = favoritedTools.flatMap(t => t.tags || []);

    const categoryCounts = favoriteCategories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tagCounts = favoriteTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Score each unfavorited tool based on similarity
    const scored: ScoredRecommendation[] = unfavoritedTools.map(tool => {
      let score = 0;
      let reason = "Highly trending in the directory";

      // 1. Category alignment score
      const catCount = categoryCounts[tool.category] || 0;
      if (catCount > 0) {
        score += catCount * 35;
        reason = `Based on your interest in ${tool.category}`;
      }

      // 2. Tag alignment score
      let tagMatches = 0;
      const toolTags = tool.tags || [];
      toolTags.forEach(tag => {
        if (tagCounts[tag]) {
          score += tagCounts[tag] * 15;
          tagMatches++;
        }
      });

      if (tagMatches > 0 && catCount > 0) {
        reason = `Matches category and tags of your favorites`;
      } else if (tagMatches > 0 && catCount === 0) {
        const matchingTag = toolTags.find(tag => tagCounts[tag]);
        reason = `Shares tags like #${matchingTag} with your favorites`;
      }

      // 3. Community rating and upvote boost
      const upvotesBoost = Math.min(20, (tool.upvotes || 0) / 15);
      score += upvotesBoost;

      const ratingBoost = tool.averageRating ? (tool.averageRating - 3) * 10 : 10;
      score += Math.max(0, ratingBoost);

      // Default backup reason for new users
      if (favorites.length === 0) {
        score = (tool.upvotes || 0) + ((tool.averageRating || 5) * 20);
        if (tool.averageRating && tool.averageRating >= 4.8) {
          reason = "Elite rating from the community";
        } else if (tool.upvotes && tool.upvotes > 20) {
          reason = "Trending upvotes this week";
        } else {
          reason = "Popular choice among AI builders";
        }
      }

      return {
        ...tool,
        recommendationScore: Math.min(100, Math.round(score)),
        recommendationReason: reason
      };
    });

    // Sort by recommendationScore desc
    return scored
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 3);
  }, [allTools, favorites]);

  if (recommendations.length === 0) return null;

  return (
    <section className="py-12 max-w-7xl mx-auto px-6 border-b border-white/5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 p-2 rounded-xl border border-amber-500/20">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              Recommended For You
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              {favorites.length > 0 
                ? "Personalized suggestions matching your library favorites" 
                : "Top curated software and tools tailored for your discovery"}
            </p>
          </div>
        </div>

        {favorites.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <HeartHandshake className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest leading-none">AI Adaptive Engine</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {recommendations.map((tool, idx) => (
          <div key={`rec-${tool.id}`} className="relative group">
            {/* Recommendation Tag / Score Badge overlaying beautifully */}
            <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1 pointer-events-none">
              <span className="text-[9px] bg-slate-950/80 border border-amber-500/30 text-amber-300 font-black uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                {favorites.length > 0 ? `${tool.recommendationScore}% Match` : "Curated"}
              </span>
            </div>

            <ToolCard 
              tool={tool} 
              isFeatured={false}
              isFavorited={favorites.includes(tool.id)}
              isComparing={comparedTools.some(t => t.id === tool.id)}
              onCompareToggle={() => onCompareToggle(tool)}
              onView={() => onView(tool)}
              onEdit={isAdmin ? () => onEdit?.(tool) : undefined}
              onDelete={isAdmin ? () => onDelete?.(tool) : undefined}
              onShare={() => onShare(tool)}
              index={idx}
            />

            {/* Match Reason Banner */}
            <div className="mt-2.5 px-4 py-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center gap-2 text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-bold tracking-tight text-slate-400">
                {tool.recommendationReason}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
