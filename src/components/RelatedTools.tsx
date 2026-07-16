import * as React from "react";
import { AiTool } from "../types";
import ToolCard from "./ToolCard";
import { Rocket } from "lucide-react";

interface RelatedToolsProps {
  currentTool: AiTool;
  allTools: AiTool[];
  favorites: string[];
  onView: (tool: AiTool) => void;
  onEdit: (tool: AiTool) => void;
  onDelete: (tool: AiTool) => void;
  onShare: (tool: AiTool) => void;
}

export default function RelatedTools({ 
  currentTool, 
  allTools, 
  favorites, 
  onView, 
  onEdit, 
  onDelete, 
  onShare 
}: RelatedToolsProps) {
  const related = React.useMemo(() => {
    return allTools
      .filter(t => t.id !== currentTool.id)
      .map(t => {
        let score = 0;
        if (t.category === currentTool.category) {
          score += 10;
        }
        if (t.tags && currentTool.tags) {
          const sharedTags = t.tags.filter(tag => currentTool.tags?.includes(tag));
          score += sharedTags.length * 5;
        }
        return { tool: t, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || b.tool.upvotes - a.tool.upvotes)
      .map(item => item.tool)
      .slice(0, 4);
  }, [currentTool, allTools]);

  if (related.length === 0) return null;

  return (
    <div id="related-tools-section" className="mt-16 pt-12 border-t border-slate-800">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Rocket className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Expand Your Horizon</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">More from {currentTool.category}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {related.map((tool, idx) => (
          <div key={`related-${tool.id}`} className="scale-[0.98] hover:scale-100 transition-transform origin-center">
            <ToolCard 
              tool={tool}
              isFavorited={favorites.includes(tool.id)}
              onView={() => {
                onView(tool);
                // Scroll the modal container or window to top
                const modalContent = document.querySelector('.custom-scrollbar');
                if (modalContent) {
                  modalContent.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              onEdit={() => onEdit(tool)}
              onDelete={() => onDelete(tool)}
              onShare={() => onShare(tool)}
              index={idx}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
