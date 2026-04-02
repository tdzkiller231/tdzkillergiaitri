import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, History, Info, RotateCcw, TrendingUp, Wallet, Trophy, AlertCircle, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/src/lib/utils';

type BetType = 'equal_7' | 'less_7' | 'greater_7';

interface RollResult {
  die1: number;
  die2: number;
  sum: number;
  win: boolean;
  payout: number;
  multiplier: number;
  timestamp: number;
  betAmount: number;
  betType: BetType;
}

const DICE_FACES = [
  null,
  // 1
  <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-2 gap-1">
    <div className="col-start-2 row-start-2 bg-zinc-900 rounded-full" />
  </div>,
  // 2
  <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-2 gap-1">
    <div className="col-start-1 row-start-1 bg-zinc-900 rounded-full" />
    <div className="col-start-3 row-start-3 bg-zinc-900 rounded-full" />
  </div>,
  // 3
  <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-2 gap-1">
    <div className="col-start-1 row-start-1 bg-zinc-900 rounded-full" />
    <div className="col-start-2 row-start-2 bg-zinc-900 rounded-full" />
    <div className="col-start-3 row-start-3 bg-zinc-900 rounded-full" />
  </div>,
  // 4
  <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-2 gap-1">
    <div className="col-start-1 row-start-1 bg-zinc-900 rounded-full" />
    <div className="col-start-3 row-start-1 bg-zinc-900 rounded-full" />
    <div className="col-start-1 row-start-3 bg-zinc-900 rounded-full" />
    <div className="col-start-3 row-start-3 bg-zinc-900 rounded-full" />
  </div>,
  // 5
  <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-2 gap-1">
    <div className="col-start-1 row-start-1 bg-zinc-900 rounded-full" />
    <div className="col-start-3 row-start-1 bg-zinc-900 rounded-full" />
    <div className="col-start-2 row-start-2 bg-zinc-900 rounded-full" />
    <div className="col-start-1 row-start-3 bg-zinc-900 rounded-full" />
    <div className="col-start-3 row-start-3 bg-zinc-900 rounded-full" />
  </div>,
  // 6
  <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-2 gap-1">
    <div className="col-start-1 row-start-1 bg-zinc-900 rounded-full" />
    <div className="col-start-3 row-start-1 bg-zinc-900 rounded-full" />
    <div className="col-start-1 row-start-2 bg-zinc-900 rounded-full" />
    <div className="col-start-3 row-start-2 bg-zinc-900 rounded-full" />
    <div className="col-start-1 row-start-3 bg-zinc-900 rounded-full" />
    <div className="col-start-3 row-start-3 bg-zinc-900 rounded-full" />
  </div>,
];

export default function App() {
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [betType, setBetType] = useState<BetType>('equal_7');
  const [isRolling, setIsRolling] = useState(false);
  const [currentDice, setCurrentDice] = useState({ d1: 1, d2: 1 });
  const [history, setHistory] = useState<RollResult[]>([]);
  const [lastResult, setLastResult] = useState<RollResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const rollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollingLockRef = useRef(false);

  const clearRollTimers = () => {
    if (rollInterval.current) {
      clearInterval(rollInterval.current);
      rollInterval.current = null;
    }
    if (settleTimeout.current) {
      clearTimeout(settleTimeout.current);
      settleTimeout.current = null;
    }
    if (failsafeTimeout.current) {
      clearTimeout(failsafeTimeout.current);
      failsafeTimeout.current = null;
    }
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
  };

  const finishRolling = () => {
    clearRollTimers();
    rollingLockRef.current = false;
    setIsRolling(false);
  };

  useEffect(() => {
    const savedBalance = localStorage.getItem('dice_master_balance');
    if (savedBalance) setBalance(parseFloat(savedBalance));

    const savedHistory = localStorage.getItem('dice_master_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const disclaimerAccepted = localStorage.getItem('dice_master_disclaimer_accepted');
    if (disclaimerAccepted !== 'true') {
      setShowDisclaimer(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dice_master_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('dice_master_history', JSON.stringify(history.slice(0, 50)));
  }, [history]);

  useEffect(() => {
    return () => {
      clearRollTimers();
    };
  }, []);

  const handleRoll = async () => {
    if (rollingLockRef.current || isRolling) return;
    if (betAmount > balance) {
      setError("Số dư không đủ!");
      return;
    }
    if (betAmount <= 0) {
      setError("Số tiền cược không hợp lệ!");
      return;
    }

    rollingLockRef.current = true;
    setError(null);
    setIsRolling(true);
    setLastResult(null);
    clearRollTimers();

    // Start visual rolling animation
    rollInterval.current = setInterval(() => {
      setCurrentDice({
        d1: Math.floor(Math.random() * 6) + 1,
        d2: Math.floor(Math.random() * 6) + 1,
      });
    }, 100);

    // Failsafe: force-stop rolling if anything goes wrong asynchronously.
    failsafeTimeout.current = setTimeout(() => {
      finishRolling();
      setError('Kết nối chậm hoặc bị gián đoạn, vui lòng thử lại.');
    }, 12000);

    try {
      const controller = new AbortController();
      requestTimeoutRef.current = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount, betType }),
        signal: controller.signal,
      });

      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }

      const data = await response.json();

      if (response.ok) {
        // Wait a bit for the animation to feel "real"
        settleTimeout.current = setTimeout(() => {
          finishRolling();
          
          const result: RollResult = {
            ...data,
            timestamp: Date.now(),
            betAmount,
            betType,
          };

          setCurrentDice({ d1: result.die1, d2: result.die2 });
          setLastResult(result);
          setBalance(prev => prev - betAmount + result.payout);
          setHistory(prev => [result, ...prev]);

          if (result.win) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: result.betType === 'equal_7' ? ['#fbbf24', '#f59e0b'] : ['#10b981', '#059669']
            });
          }
        }, 1200);
      } else {
        throw new Error(data.error || "Lỗi khi quay xúc xắc");
      }
    } catch (err) {
      finishRolling();
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Yêu cầu quá thời gian, vui lòng thử lại.');
      } else {
        setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
      }
    }
  };

  const resetGame = () => {
    setBalance(1000);
    setHistory([]);
    setLastResult(null);
    setError(null);
  };

  const acceptDisclaimer = () => {
    localStorage.setItem('dice_master_disclaimer_accepted', 'true');
    setShowDisclaimer(false);
  };

  const stats = {
    totalPlayed: history.length,
    wins: history.filter(h => h.win).length,
    totalProfit: history.reduce((acc, h) => acc + (h.payout - h.betAmount), 0).toFixed(2),
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20">
            <TrendingUp className="w-6 h-6 text-zinc-950" />
          </div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight">TDZKILLER <span className="text-amber-500">CR7</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 px-4 py-2 rounded-full">
            <Wallet className="w-4 h-4 text-amber-500" />
            <span className="font-mono font-bold">{balance.toLocaleString()}</span>
          </div>
          <button 
            onClick={resetGame}
            className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-500 hover:text-zinc-300"
            title="Reset Game"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Game Area */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Dice Display */}
          <div className="relative aspect-video bg-zinc-900/30 border border-zinc-800/50 rounded-3xl flex items-center justify-center gap-8 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none" />
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={`dice1-${currentDice.d1}`}
                initial={isRolling ? { rotate: 0, scale: 0.8 } : false}
                animate={{ rotate: isRolling ? [0, 90, 180, 270, 360] : 0, scale: 1 }}
                transition={{ duration: 0.1, repeat: isRolling ? Infinity : 0 }}
                className="w-24 h-24 md:w-32 md:h-32 bg-zinc-100 rounded-2xl shadow-2xl flex items-center justify-center"
              >
                {DICE_FACES[currentDice.d1]}
              </motion.div>

              <motion.div 
                key={`dice2-${currentDice.d2}`}
                initial={isRolling ? { rotate: 0, scale: 0.8 } : false}
                animate={{ rotate: isRolling ? [0, -90, -180, -270, -360] : 0, scale: 1 }}
                transition={{ duration: 0.1, repeat: isRolling ? Infinity : 0 }}
                className="w-24 h-24 md:w-32 md:h-32 bg-zinc-100 rounded-2xl shadow-2xl flex items-center justify-center"
              >
                {DICE_FACES[currentDice.d2]}
              </motion.div>
            </AnimatePresence>

            {lastResult && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-8 flex flex-col items-center gap-2"
              >
                <div className="text-4xl font-display font-black text-zinc-100">TỔNG: {lastResult.sum}</div>
                <div className={cn(
                  "px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest",
                  lastResult.win ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                )}>
                  {lastResult.win ? `THẮNG +${lastResult.payout.toLocaleString()}` : "THUA"}
                </div>
              </motion.div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bet Amount */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Coins className="w-3 h-3" /> Số tiền cược
                </label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <div className="flex gap-1">
                    {[10, 50, 100].map(amt => (
                      <button 
                        key={amt}
                        onClick={() => setBetAmount(prev => prev + amt)}
                        className="px-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bet Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-3 h-3" /> Loại cược
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setBetType('less_7')}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-bold transition-all border",
                      betType === 'less_7' 
                        ? "bg-blue-500 text-zinc-950 border-blue-400 shadow-lg shadow-blue-500/20" 
                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    Tổng &lt; 7 (x2.3)
                  </button>
                  <button 
                    onClick={() => setBetType('equal_7')}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-bold transition-all border",
                      betType === 'equal_7' 
                        ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20" 
                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    Tổng = 7 (x5.8)
                  </button>
                  <button 
                    onClick={() => setBetType('greater_7')}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-bold transition-all border",
                      betType === 'greater_7' 
                        ? "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-lg shadow-emerald-500/20" 
                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    Tổng &gt; 7 (x2.3)
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button 
              onClick={handleRoll}
              disabled={isRolling}
              className={cn(
                "w-full py-4 rounded-2xl font-display font-black text-xl uppercase tracking-widest transition-all",
                isRolling 
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                  : "bg-zinc-100 text-zinc-950 hover:bg-white hover:scale-[1.02] active:scale-[0.98] shadow-xl"
              )}
            >
              {isRolling ? "Đang quay..." : "QUAY NGAY"}
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-400 uppercase tracking-widest font-bold">Cửa Tổng = 7</p>
                <p className="mt-1 text-zinc-200 font-semibold">Trúng khi tổng bằng 7</p>
                <p className="text-amber-400 mt-1">Thưởng x5.8</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-400 uppercase tracking-widest font-bold">Cửa Tổng &lt; 7</p>
                <p className="mt-1 text-zinc-200 font-semibold">Trúng khi tổng từ 2 đến 6</p>
                <p className="text-blue-400 mt-1">Thưởng x2.3</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-400 uppercase tracking-widest font-bold">Cửa Tổng &gt; 7</p>
                <p className="mt-1 text-zinc-200 font-semibold">Trúng khi tổng từ 8 đến 12</p>
                <p className="text-emerald-400 mt-1">Thưởng x2.3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Stats & History */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Stats */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl space-y-6">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Thống kê
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <div className="text-xs text-zinc-500 font-bold uppercase mb-1">Số lượt</div>
                <div className="text-xl font-display font-bold">{stats.totalPlayed}</div>
              </div>
              <div className="col-span-2 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <div className="text-xs text-zinc-500 font-bold uppercase mb-1">Lợi nhuận</div>
                <div className={cn(
                  "text-2xl font-display font-black",
                  parseFloat(stats.totalProfit) >= 0 ? "text-amber-500" : "text-rose-500"
                )}>
                  {parseFloat(stats.totalProfit) >= 0 ? "+" : ""}{stats.totalProfit}
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden flex-1 min-h-[400px]">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" /> Lịch sử
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 opacity-50">
                  <RotateCcw className="w-8 h-8" />
                  <p className="text-xs font-bold uppercase tracking-widest">Chưa có dữ liệu</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.timestamp}
                    className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-6 h-6 bg-zinc-100 rounded-md flex items-center justify-center text-[8px] text-zinc-950 font-bold">
                          {item.die1}
                        </div>
                        <div className="w-6 h-6 bg-zinc-100 rounded-md flex items-center justify-center text-[8px] text-zinc-950 font-bold">
                          {item.die2}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Tổng {item.sum}</span>
                        <span className="text-[10px] text-zinc-500">
                          {item.betType === 'equal_7' ? 'Cược = 7' : item.betType === 'less_7' ? 'Cược < 7' : 'Cược > 7'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-sm font-bold",
                        item.win ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {item.win ? `+${item.payout.toLocaleString()}` : `-${item.betAmount.toLocaleString()}`}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-4xl mt-12 pt-8 border-t border-zinc-900 text-center space-y-4">
        <p className="text-zinc-500 text-xs font-medium">
          Trò chơi mô phỏng xác suất. Vui lòng chơi có trách nhiệm.
        </p>
      </footer>

      <AnimatePresence>
        {showDisclaimer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-8 space-y-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-display font-black text-zinc-100">Thông báo quan trọng</h2>
                  <p className="text-sm text-zinc-300 mt-2">
                    Trò chơi này chỉ mang tính giải trí giữa bạn bè, không khuyến khích cá cược hoặc sử dụng ngoài mục đích vui vẻ.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 text-sm text-zinc-300 space-y-2">
                <p>- Chơi có trách nhiệm và tự đặt giới hạn cho bản thân.</p>
                <p>- Chỉ tham gia khi bạn cảm thấy thoải mái và kiểm soát được.</p>
                <p>- Nếu thấy không phù hợp, hãy dừng lại bất kỳ lúc nào.</p>
              </div>

              <button
                onClick={acceptDisclaimer}
                className="w-full py-3 rounded-2xl bg-zinc-100 text-zinc-950 font-bold uppercase tracking-wider hover:bg-white transition-colors"
              >
                Tôi đã hiểu
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
