import React, { useState } from 'react';
import { 
  X, 
  Star, 
  TrendingUp, 
  Award, 
  GraduationCap, 
  Building2, 
  UserCheck, 
  Flame, 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Check 
} from 'lucide-react';
import { SearchResultItem } from '../types';

interface ItemDetailModalProps {
  item: SearchResultItem | null;
  onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose }) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      id="item-detail-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        id="item-detail-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#111116] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Ambient top red glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          id="close-item-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Avatar / Badge */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 p-0.5 shadow-lg shadow-red-950/60 flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full bg-[#16141a] rounded-2xl flex items-center justify-center text-red-500">
              {item.category === 'profesor' && <GraduationCap className="w-8 h-8" />}
              {item.category === 'alumno' && <UserCheck className="w-8 h-8" />}
              {item.category === 'institucion' && <Building2 className="w-8 h-8" />}
              {item.category === 'materia' && <Award className="w-8 h-8" />}
            </div>
          </div>

          <div className="flex-1 pr-6">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                {item.category}
              </span>
              {item.badge && (
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  {item.badge}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white font-display">
              {item.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {item.institution}
            </p>
          </div>
        </div>

        {/* Score Card */}
        <div className="bg-[#17171e] border border-white/5 rounded-xl p-4 mb-5 flex items-center justify-around text-center">
          <div>
            <div className="text-3xl font-black text-white font-display flex items-center justify-center gap-1">
              <Star className="w-6 h-6 fill-red-500 text-red-500" />
              <span>{item.rating.toFixed(1)}</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 uppercase font-semibold">Calificación General</div>
          </div>

          <div className="w-px h-10 bg-white/10"></div>

          <div>
            <div className="text-3xl font-black text-red-400 font-display">
              {item.votesCount + (hasVoted ? 1 : 0)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 uppercase font-semibold">Votos Totales</div>
          </div>

          <div className="w-px h-10 bg-white/10"></div>

          <div>
            <div className="text-3xl font-black text-white font-display">
              {item.rank ? `#${item.rank}` : 'Top 5%'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 uppercase font-semibold">Ranking Campus</div>
          </div>
        </div>

        {/* Criteria Breakdown */}
        <div className="space-y-3 mb-6 text-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Claridad y Metodología</span>
            <span className="text-white font-semibold">95%</span>
          </div>
          <div className="w-full bg-zinc-800/60 rounded-full h-2 overflow-hidden">
            <div className="bg-red-600 h-full rounded-full w-[95%]"></div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Trato y Accesibilidad</span>
            <span className="text-white font-semibold">92%</span>
          </div>
          <div className="w-full bg-zinc-800/60 rounded-full h-2 overflow-hidden">
            <div className="bg-red-500 h-full rounded-full w-[92%]"></div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Popularidad en el Semestre</span>
            <span className="text-white font-semibold">98%</span>
          </div>
          <div className="w-full bg-zinc-800/60 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full w-[98%]"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            id="vote-item-button"
            onClick={() => setHasVoted(!hasVoted)}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              hasVoted
                ? 'bg-zinc-800 text-red-400 border border-red-500/40'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/60 active:scale-98'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'fill-red-400' : ''}`} />
            <span>{hasVoted ? '¡Voto registrado en Graderz5!' : 'Votar / Calificar'}</span>
          </button>

          <button
            id="share-item-button"
            onClick={handleShare}
            className="p-3 rounded-xl bg-[#1a1a22] hover:bg-[#242430] border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Compartir enlace"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
