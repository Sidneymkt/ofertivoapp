import { useMemo } from 'react';
import { usePoints } from './usePoints';

export interface UserLevel {
  level: number;
  title: string;
  emoji: string;
  minPoints: number;
  maxPoints: number;
  progress: number; // 0-100
  pointsToNext: number;
  color: string;
}

const LEVELS = [
  { level: 1, title: 'Explorador do Bairro', emoji: '🗺️', minPoints: 0, maxPoints: 500, color: 'from-slate-400 to-slate-500' },
  { level: 2, title: 'Caçador de Ofertas', emoji: '🎯', minPoints: 500, maxPoints: 1500, color: 'from-emerald-400 to-emerald-600' },
  { level: 3, title: 'Economista Local', emoji: '💰', minPoints: 1500, maxPoints: 3000, color: 'from-blue-400 to-blue-600' },
  { level: 4, title: 'VIP Econômico', emoji: '💎', minPoints: 3000, maxPoints: 6000, color: 'from-purple-400 to-purple-600' },
  { level: 5, title: 'Influencer Local', emoji: '⭐', minPoints: 6000, maxPoints: 10000, color: 'from-amber-400 to-amber-600' },
  { level: 6, title: 'Lenda do Bairro', emoji: '👑', minPoints: 10000, maxPoints: Infinity, color: 'from-yellow-400 to-orange-500' },
];

export const useUserLevel = (): UserLevel => {
  const { pointsStats } = usePoints();
  const totalPoints = pointsStats?.totalPoints || 0;

  return useMemo(() => {
    const currentLevel = LEVELS.reduce((acc, lvl) => {
      if (totalPoints >= lvl.minPoints) return lvl;
      return acc;
    }, LEVELS[0]);

    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
    const range = (nextLevel?.minPoints || currentLevel.maxPoints) - currentLevel.minPoints;
    const earned = totalPoints - currentLevel.minPoints;
    const progress = range === Infinity ? 100 : Math.min((earned / range) * 100, 100);
    const pointsToNext = nextLevel ? nextLevel.minPoints - totalPoints : 0;

    return {
      ...currentLevel,
      progress,
      pointsToNext,
    };
  }, [totalPoints]);
};

export const getLevelByPoints = (points: number): UserLevel => {
  const currentLevel = LEVELS.reduce((acc, lvl) => {
    if (points >= lvl.minPoints) return lvl;
    return acc;
  }, LEVELS[0]);

  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
  const range = (nextLevel?.minPoints || currentLevel.maxPoints) - currentLevel.minPoints;
  const earned = points - currentLevel.minPoints;
  const progress = range === Infinity ? 100 : Math.min((earned / range) * 100, 100);
  const pointsToNext = nextLevel ? nextLevel.minPoints - points : 0;

  return { ...currentLevel, progress, pointsToNext };
};
