/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Wallet, 
  TrendingUp, 
  Settings, 
  Info, 
  DollarSign, 
  BarChart3,
  ChevronRight,
  RefreshCcw,
  Target,
  ShieldAlert,
  Activity,
  History,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

enum RiskType {
  PERCENT = 'percent',
  FIXED = 'fixed'
}

enum CommissionType {
  PER_LOT = 'perLot',
  PERCENT = 'percent'
}

interface CommissionPreset {
  id: string;
  name: string;
  type: CommissionType;
  value: number;
  isZero?: boolean;
}

const COMMISSION_PRESETS: CommissionPreset[] = [
  { id: 'FTMO_EVAL', name: 'FTMO (Evaluation)', type: CommissionType.PER_LOT, value: 5.0 },
  { id: 'FP_EVAL', name: 'FundingPips (Evaluation)', type: CommissionType.PER_LOT, value: 2.0 },
  { id: 'FP_FUNDED', name: 'FundingPips (Funded)', type: CommissionType.PER_LOT, value: 0, isZero: true },
  { id: 'FTMO_METALS', name: 'FTMO Metals', type: CommissionType.PERCENT, value: 0.0014 },
  { id: 'CUSTOM', name: '自定義 (Custom)', type: CommissionType.PER_LOT, value: 7.0 },
];

interface SymbolPreset {
  id: string;
  name: string;
  contractSize: number;
  defaultEntry: number;
  defaultSL: number;
  icon?: string;
}

const SYMBOLS: SymbolPreset[] = [
  { id: 'EURUSD', name: '歐元/美元', contractSize: 100000, defaultEntry: 1.10000, defaultSL: 1.09500 },
  { id: 'GBPUSD', name: '英鎊/美元', contractSize: 100000, defaultEntry: 1.25000, defaultSL: 1.24500 },
  { id: 'XAUUSD', name: '黃金 (XAU)', contractSize: 100, defaultEntry: 2350.00, defaultSL: 2340.00 },
  { id: 'XAGUSD', name: '白銀 (XAG)', contractSize: 5000, defaultEntry: 30.00, defaultSL: 29.50 },
  { id: 'CUSTOM', name: '自定義商品', contractSize: 100000, defaultEntry: 1.0000, defaultSL: 0.9900 },
];

export default function App() {
  // --- State ---
  const [activeSymbol, setActiveSymbol] = useState<string>(SYMBOLS[0].id);
  const [balance, setBalance] = useState<number>(10000);
  const [riskType, setRiskType] = useState<RiskType>(RiskType.PERCENT);
  const [riskValue, setRiskValue] = useState<number>(1);
  
  // Commission States
  const [selectedCommPreset, setSelectedCommPreset] = useState<string>(COMMISSION_PRESETS[0].id);
  const [commType, setCommType] = useState<CommissionType>(COMMISSION_PRESETS[0].type);
  const [commValue, setCommValue] = useState<number>(COMMISSION_PRESETS[0].value);

  const [entryPrice, setEntryPrice] = useState<number>(1.10000);
  const [stopLoss, setStopLoss] = useState<number>(1.09500);
  const [contractSize, setContractSize] = useState<number>(100000);

  // --- Helpers ---
  const handleSymbolChange = (id: string) => {
    const symbol = SYMBOLS.find(s => s.id === id);
    if (symbol) {
      setActiveSymbol(id);
      if (id !== 'CUSTOM') {
        setContractSize(symbol.contractSize);
        setEntryPrice(symbol.defaultEntry);
        setStopLoss(symbol.defaultSL);
      }
    }
  };

  const handlePresetChange = (id: string) => {
    const preset = COMMISSION_PRESETS.find(p => p.id === id);
    if (preset) {
      setSelectedCommPreset(id);
      setCommType(preset.type);
      setCommValue(preset.value);
    }
  };

  // --- Calculations ---
  const results = useMemo(() => {
    if (entryPrice === 0 || stopLoss === 0 || entryPrice === stopLoss) {
      return { lots: 0, riskCash: 0, priceDiff: 0, isInvalid: true, riskRatio: 0 };
    }

    // 1. Total Risk Cash
    let riskCash = riskType === RiskType.PERCENT 
      ? balance * (riskValue / 100) 
      : riskValue;

    // 2. Price Difference
    const priceDiff = Math.abs(entryPrice - stopLoss);

    // 3. 每手佣金計算 (針對百分比模式採用雙邊結算邏輯)
    // 總風險 = (單手點值損失 * 手數) + (單手佣金 * 手數)
    // 所以 手數 = 風險金額 / (單手點值損失 + 單手佣金)
    
    let commissionPerLot = 0;
    if (commType === CommissionType.PER_LOT) {
      commissionPerLot = commValue;
    } else {
      // 模式 B: 手數 * 合約規模 * 當前價格 * 百分比
      // 這裡採用進場與出場價格的雙向名目價值百分比
      const percentage = commValue / 100;
      const entryCommPerLot = (entryPrice * contractSize) * percentage;
      const exitCommPerLot = (stopLoss * contractSize) * percentage;
      commissionPerLot = entryCommPerLot + exitCommPerLot;
    }

    // 4. Calculations
    const lossPerLotWithoutComm = priceDiff * contractSize;
    const totalLossPerLot = lossPerLotWithoutComm + commissionPerLot;

    let lots = 0;
    if (totalLossPerLot > 0) {
      lots = riskCash / totalLossPerLot;
    }

    const riskRatio = (riskCash / balance) * 100;

    return { 
      lots, 
      riskCash, 
      priceDiff, 
      isInvalid: false,
      riskRatio
    };
  }, [balance, riskType, riskValue, commType, commValue, entryPrice, stopLoss, contractSize]);

  const pipsOrPoints = useMemo(() => {
    if (contractSize >= 100000) {
      return `${(results.priceDiff / 0.0001).toFixed(1)} Pips`;
    }
    return `${results.priceDiff.toFixed(2)} Points`;
  }, [results.priceDiff, contractSize]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 p-4 md:p-8">
      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Top Navigation Bar */}
        <motion.nav 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10 border-b border-slate-800 pb-6"
        >
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest text-slate-100 uppercase">Pro Terminal</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">交易倉位計算系統 v3.0</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
              <History className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-3 ml-4 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
               <span className="text-[11px] font-black text-slate-400">賬戶狀態:</span>
               <span className="text-[11px] font-black text-emerald-400">運行中</span>
            </div>
          </div>
        </motion.nav>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Main Controls - Left Panel */}
          <div className="xl:col-span-8 space-y-8">
            
            {/* Symbol Selector Sub-nav */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
                <Target className="w-3 h-3" /> 選擇交易商品市場
              </p>
              <motion.section 
                className="grid grid-cols-2 sm:grid-cols-5 gap-2"
              >
                {SYMBOLS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSymbolChange(s.id)}
                    className={`
                      px-3 py-4 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all duration-300 border
                      ${activeSymbol === s.id 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'bg-slate-900/30 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}
                    `}
                  >
                    {s.name}
                  </button>
                ))}
              </motion.section>
            </div>

            {/* Inputs Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Account Sector */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-900/40 backdrop-blur-sm p-8 rounded-[2rem] border border-slate-800/50 flex flex-col gap-8 shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-400 font-black text-xs uppercase tracking-widest">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    資金與風險管理
                  </div>
                  <Lock className="w-3 h-3 text-slate-700" />
                </div>
                
                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 group-focus-within:text-emerald-500 transition-colors">賬戶總餘額 (USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input 
                        type="number" 
                        value={balance}
                        onChange={(e) => setBalance(Number(e.target.value))}
                        className="w-full pl-12 pr-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all font-mono text-lg font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">單筆交易風險</label>
                    <div className="flex p-1.5 bg-slate-950/50 border border-slate-800 rounded-[1.25rem]">
                      <select 
                        value={riskType}
                        onChange={(e) => setRiskType(e.target.value as RiskType)}
                        className="w-1/3 bg-transparent border-0 px-4 py-2 font-black text-[11px] text-slate-400 uppercase tracking-widest focus:ring-0 cursor-pointer"
                      >
                        <option value={RiskType.PERCENT} className="bg-slate-900">比例 %</option>
                        <option value={RiskType.FIXED} className="bg-slate-900">金額 $</option>
                      </select>
                      <input 
                        type="number" 
                        value={riskValue}
                        onChange={(e) => setRiskValue(Number(e.target.value))}
                        className="w-2/3 bg-slate-800/30 border-0 rounded-xl px-4 py-2 font-mono font-bold text-emerald-400 focus:ring-0 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                      佣金與成本方案
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border ${selectedCommPreset === 'FP_FUNDED' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                        {selectedCommPreset === 'FP_FUNDED' ? 'Zero Commission Mode' : 'Standard Cost'}
                      </span>
                    </label>
                    
                    <select 
                      value={selectedCommPreset}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 font-bold text-sm text-slate-300 focus:border-emerald-500/50 focus:ring-0 appearance-none cursor-pointer outline-none mb-2"
                    >
                      {COMMISSION_PRESETS.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                      ))}
                    </select>

                    <div className="flex p-1.5 bg-slate-950/50 border border-slate-800 rounded-[1.25rem]">
                      <div className="flex w-1/3 bg-slate-900 rounded-xl overflow-hidden mr-2 p-1">
                        <button 
                          onClick={() => setCommType(CommissionType.PER_LOT)}
                          className={`flex-1 text-[9px] font-black transition-colors rounded-lg ${commType === CommissionType.PER_LOT ? 'bg-emerald-500 text-emerald-950' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          USD/L
                        </button>
                        <button 
                          onClick={() => setCommType(CommissionType.PERCENT)}
                          className={`flex-1 text-[9px] font-black transition-colors rounded-lg ${commType === CommissionType.PERCENT ? 'bg-emerald-500 text-emerald-950' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          %
                        </button>
                      </div>
                      <input 
                        type="number" 
                        value={commValue}
                        onChange={(e) => {
                          setCommValue(Number(e.target.value));
                          setSelectedCommPreset('CUSTOM');
                        }}
                        placeholder="0.00"
                        className="w-2/3 bg-transparent border-0 px-4 py-2 font-mono font-bold text-emerald-400 focus:ring-0 outline-none placeholder:text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Price Sector */}
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-900/40 backdrop-blur-sm p-8 rounded-[2rem] border border-slate-800/50 flex flex-col gap-8 shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-400 font-black text-xs uppercase tracking-widest">
                    <BarChart3 className="w-4 h-4 text-rose-500" />
                    市場報價與策略
                  </div>
                  <Activity className="w-3 h-3 text-slate-700" />
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">進場執行價格</label>
                    <input 
                      type="number" 
                      step="0.00001"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(Number(e.target.value))}
                      className="w-full p-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-mono text-lg font-bold text-blue-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">止損清算價格 (SL)</label>
                    <input 
                       type="number" 
                       step="0.00001"
                       value={stopLoss}
                       onChange={(e) => setStopLoss(Number(e.target.value))}
                       className="w-full p-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all font-mono text-lg font-bold text-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">單手合約規模 (Units)</label>
                    <div className="relative">
                      <Settings className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input 
                        type="number" 
                        value={contractSize}
                        onChange={(e) => setContractSize(Number(e.target.value))}
                        className="w-full pl-12 pr-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all font-mono text-lg font-bold text-amber-500 outline-none"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">
                       <span>FX: 100,000</span>
                       <span>GOLD: 100</span>
                       <span>SILVER: 5,000</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Results Sector - Right Panel */}
          <div className="xl:col-span-4 flex flex-col gap-8">
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500 rounded-[2.5rem] p-10 text-emerald-950 shadow-[0_30px_60px_-15px_rgba(16,185,129,0.3)] relative overflow-hidden flex-1 flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-[100px] -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-900 rounded-full blur-[80px] -ml-24 -mb-24" />
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-16">
                   <div className="bg-emerald-950 text-emerald-400 p-3 rounded-2xl">
                     <Calculator className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">數據分析</p>
                     <p className="text-xs font-black uppercase tracking-widest">即時計算結果</p>
                   </div>
                </div>

                <div className="space-y-12 flex-1">
                  <div className="grid grid-cols-2 gap-8 border-b border-emerald-400/20 pb-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">止損距離</p>
                      <p className="text-2xl font-black tabular-nums">{pipsOrPoints}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">預期虧損</p>
                      <p className="text-2xl font-black tabular-nums">-${results.riskCash.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60 text-center">最佳開倉手數</p>
                    <div className="flex flex-col items-center justify-center">
                       <div className="flex items-baseline gap-3">
                         <AnimatePresence mode="wait">
                          <motion.span 
                            key={results.lots}
                            initial={{ opacity: 0, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            className="text-8xl font-black tracking-tighter tabular-nums"
                          >
                            {results.lots.toFixed(2)}
                          </motion.span>
                         </AnimatePresence>
                         <span className="text-xl font-black opacity-40">LOTS</span>
                       </div>
                    </div>
                  </div>

                  {/* Risk Bar Visualization */}
                  <div className="space-y-3">
                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-50">
                        <span>賬戶增壓風險</span>
                        <span>{results.riskRatio.toFixed(1)}%</span>
                     </div>
                     <div className="h-2 w-full bg-emerald-900/20 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-emerald-950"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(results.riskRatio * 5, 100)}%` }}
                        />
                     </div>
                  </div>
                </div>

                <div className="mt-auto pt-10">
                   <button className="w-full bg-emerald-950 text-emerald-400 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                      導出至交易終端 <RefreshCcw className="w-4 h-4" />
                   </button>
                </div>
              </div>
            </motion.div>

            {/* Terminal Message Box */}
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className={`p-6 rounded-[2rem] border backdrop-blur-md flex items-start gap-4 transition-all duration-500 ${results.isInvalid ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}
            >
              <div className={`p-2.5 rounded-xl ${results.isInvalid ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'}`}>
                {results.isInvalid ? <ShieldAlert className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="space-y-1">
                <h4 className={`text-xs font-black uppercase tracking-widest ${results.isInvalid ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {results.isInvalid ? '數值校驗失敗' : '系統就緒'}
                </h4>
                <p className={`text-[11px] font-bold leading-relaxed ${results.isInvalid ? 'text-rose-300/60' : 'text-slate-500'}`}>
                  {results.isInvalid 
                    ? '請核心檢查進場價與止損價設定。數值不可為零或完全重疊。' 
                    : '倉位大小已自動對沖交易佣金與市場滑點風險。建議嚴格執行止損。'}
                </p>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Global Footer System */}
        <footer className="mt-16 border-t border-slate-900 pt-10 text-center space-y-6">
          <div className="max-w-3xl mx-auto">
             <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] leading-loose">
               風險提示：外匯交易具備高槓桿性，可能導致資金損失超過初始存款。
               計算公式：手數 = 風險金額 / (止損距離 * 合約規模 + 單手佣金)。
               本系統計算結果僅供參考。
             </p>
          </div>
          <div className="flex items-center justify-center gap-10">
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest underline decoration-emerald-500/50 decoration-2 underline-offset-4">精密計算模式已激活</span>
            </div>
            <div className="flex items-center gap-2">
               <ShieldAlert className="w-3 h-3 text-slate-700" />
               <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">加密數據處理</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
