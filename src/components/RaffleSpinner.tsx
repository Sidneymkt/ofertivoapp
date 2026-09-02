import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface RaffleSpinnerProps {
  participants: Array<{ id: string; name: string }>;
  isSpinning: boolean;
  winnerId?: string;
  onAnimationComplete?: () => void;
}

// Som de roleta/embaralhamento usando Web Audio API
const playShuffleSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTick = (time: number, frequency: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.15, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
      
      oscillator.start(time);
      oscillator.stop(time + 0.05);
    };

    // Sequência de ticks que simula embaralhamento de cartas/roleta
    for (let i = 0; i < 30; i++) {
      const frequency = 400 + Math.random() * 600; // Frequência variável
      playTick(audioContext.currentTime + (i * 0.08), frequency);
    }
  } catch (error) {
    console.log('Could not play shuffle sound:', error);
  }
};

export const RaffleSpinner: React.FC<RaffleSpinnerProps> = ({
  participants,
  isSpinning,
  winnerId,
  onAnimationComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(50);
  const [showConfetti, setShowConfetti] = useState(false);
  const soundPlayedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Tocar som contínuo durante o sorteio
  useEffect(() => {
    if (isSpinning && !soundPlayedRef.current) {
      soundPlayedRef.current = true;
      playShuffleSound();
    }
    
    if (!isSpinning) {
      soundPlayedRef.current = false;
    }
  }, [isSpinning]);

  // Som de "tick" a cada mudança de participante
  useEffect(() => {
    if (!isSpinning) return;

    const playTickSound = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // Frequência aumenta conforme desacelera para criar tensão
        const baseFreq = 800 - (animationSpeed * 2);
        oscillator.frequency.value = Math.max(300, baseFreq);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.03);
      } catch (error) {
        // Silently fail
      }
    };

    playTickSound();
  }, [currentIndex, isSpinning, animationSpeed]);

  useEffect(() => {
    if (!isSpinning) return;

    let animationFrames = 0;
    const maxFrames = 100;
    
    const interval = setInterval(() => {
      animationFrames++;
      
      // Desacelerar gradualmente
      if (animationFrames > maxFrames * 0.7) {
        setAnimationSpeed(prev => Math.min(prev + 20, 300));
      }
      
      // Parar no vencedor
      if (animationFrames >= maxFrames) {
        const winnerIndex = participants.findIndex(p => p.id === winnerId);
        if (winnerIndex !== -1) {
          setCurrentIndex(winnerIndex);
          setShowConfetti(true);
          setTimeout(() => {
            onAnimationComplete?.();
          }, 1000);
        }
        clearInterval(interval);
        return;
      }
      
      // Continuar girando
      setCurrentIndex(prev => (prev + 1) % participants.length);
    }, animationSpeed);

    return () => clearInterval(interval);
  }, [isSpinning, animationSpeed, participants, winnerId, onAnimationComplete]);

  const getParticipantStyle = (index: number) => {
    const distance = Math.abs(index - currentIndex);
    const isCurrent = index === currentIndex;
    
    if (isCurrent) {
      return 'scale-110 bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-2xl border-4 border-yellow-300 z-10';
    } else if (distance === 1) {
      return 'scale-95 opacity-70';
    } else {
      return 'scale-90 opacity-40';
    }
  };

  const winner = participants[currentIndex];

  return (
    <div className="relative">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fade-in"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animation: `confetti ${1 + Math.random()}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`
              }}
            >
              <Sparkles className="h-4 w-4 text-yellow-400" />
            </div>
          ))}
        </div>
      )}

      <Card className="bg-gradient-to-b from-[#1C1C1E] to-[#0E0E10] border-[#28A745]/30">
        <CardContent className="p-8">
          {/* Spinner Container */}
          <div className="relative h-96 flex items-center justify-center">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[#28A745]/5 rounded-full blur-3xl animate-pulse" />
            
            {/* Main Spinner */}
            <div className="relative w-full max-w-md">
              <div className="flex flex-col items-center gap-4">
                {participants.slice(
                  Math.max(0, currentIndex - 2),
                  currentIndex + 3
                ).map((participant, index) => {
                  const actualIndex = Math.max(0, currentIndex - 2) + index;
                  return (
                    <div
                      key={participant.id}
                      className={`
                        transition-all duration-300 ease-out
                        w-full p-6 rounded-xl
                        ${getParticipantStyle(actualIndex)}
                      `}
                    >
                      <div className="flex items-center justify-center gap-3">
                        {actualIndex === currentIndex && isSpinning && (
                          <Trophy className="h-6 w-6 animate-bounce" />
                        )}
                        <p className="font-bold text-xl text-center">
                          {participant.name}
                        </p>
                        {actualIndex === currentIndex && isSpinning && (
                          <Trophy className="h-6 w-6 animate-bounce" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Winner Announcement */}
            {!isSpinning && winnerId && showConfetti && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl animate-fade-in">
                <div className="text-center space-y-4 p-8">
                  <Trophy className="h-20 w-20 text-yellow-400 mx-auto animate-bounce" />
                  <h2 className="text-4xl font-bold text-white">
                    🎉 Parabéns!
                  </h2>
                  <p className="text-2xl text-yellow-300 font-semibold">
                    {winner?.name}
                  </p>
                  <p className="text-lg text-gray-300">
                    Você é o grande vencedor!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Status Indicator */}
          <div className="mt-8 text-center">
            {isSpinning ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-3 w-3 bg-[#28A745] rounded-full animate-pulse" />
                  <p className="text-[#28A745] font-semibold text-lg">
                    🎲 Sorteando...
                  </p>
                </div>
                <p className="text-sm text-gray-400">
                  Aguarde enquanto selecionamos o ganhador
                </p>
              </div>
            ) : winnerId ? (
              <p className="text-green-500 font-semibold">
                ✅ Sorteio finalizado!
              </p>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#FFD700]/20 via-[#FFA500]/20 to-[#FFD700]/20 border-2 border-[#FFD700] rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.3)] animate-pulse">
                  <div className="h-3 w-3 bg-[#FFD700] rounded-full animate-bounce" />
                  <p className="text-[#FFD700] font-bold text-lg">
                    🎯 Pronto para iniciar o sorteio
                  </p>
                  <div className="h-3 w-3 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <p className="text-sm text-gray-400">
                  Clique em "SORTEAR AGORA" para iniciar
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
