import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StepType, PizzaConfiguration, OrderResult, MenuItem } from './types';
import { 
  STEPS, SIZES, CRUSTS, CUTS, SAUCES, CHEESES, MEATS, VEGGIES, formatPrice 
} from './constants';
import { StepNavigator } from './components/StepNavigator';
import { OptionCard } from './components/OptionCard';
import { 
  ChevronLeft, CheckCircle, Loader2, 
  Flame, ArrowLeft, ArrowRight, Receipt, Mic, Edit2, Play, Square, Info
} from 'lucide-react';
import { generateChefComment, interpretVoiceOrder } from './services/geminiService';

// --- Components Helpers ---

const PreviewRow = ({ label, value }: { label: string, value?: string }) => (
  <div className="flex justify-between text-sm py-1">
     <span className="text-gray-500">{label}</span>
     <span className="font-medium text-gray-800">{value || '-'}</span>
  </div>
);

const ToppingRow: React.FC<{ name?: string; price?: number }> = ({ name, price }) => (
  <div className="flex justify-between text-sm py-1 border-b border-dashed border-gray-100 last:border-0">
     <span className="text-gray-700">{name}</span>
     <span className="text-gray-500 text-xs">{price ? formatPrice(price) : ''}</span>
  </div>
);

// --- Main App ---

export default function App() {
  // View State: 'landing' | 'manual' | 'voice' | 'preview_voice' | 'success'
  const [view, setView] = useState<'landing' | 'manual' | 'voice' | 'preview_voice' | 'success'>('landing');
  
  // Data State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<StepType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  
  // Voice Journey Message State
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);

  // Default Config
  const defaultConfig: PizzaConfiguration = {
    size: 'large',
    crust: 'original',
    cut: 'normal',
    sauce: 'tomato',
    sauceAmount: 'normal',
    bake: 'normal',
    cheeses: {},
    meats: {},
    veggies: {},
  };

  const [config, setConfig] = useState<PizzaConfiguration>(defaultConfig);

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentStep = STEPS[currentStepIndex];

  // --- Helpers ---
  const findItem = (list: MenuItem[], id: string | null) => list.find(i => i.id === id);
  
  // Calculate Totals
  const totals = useMemo(() => {
    let price = 0;
    let calories = 0;

    const add = (item?: MenuItem) => {
      if (item) {
        price += item.price;
        calories += item.calories;
      }
    };

    add(findItem(SIZES, config.size));
    add(findItem(CRUSTS, config.crust));
    add(findItem(SAUCES, config.sauce));
    
    // Toppings
    const addToppings = (record: Record<string, string>, list: MenuItem[]) => {
      if(!record) return;
      Object.keys(record).forEach(id => {
         add(findItem(list, id));
      });
    };
    
    addToppings(config.cheeses, CHEESES);
    addToppings(config.meats, MEATS);
    addToppings(config.veggies, VEGGIES);

    return { price, calories };
  }, [config]);

  // --- Voice Logic ---
  const startRecording = async () => {
    try {
      setVoiceError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic Error:", err);
      setVoiceError("دسترسی به میکروفون امکان‌پذیر نیست.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.onstop = processAudio;
    }
  };

  const processAudio = async () => {
    setIsProcessing(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        try {
          const aiConfig = await interpretVoiceOrder(base64Audio);
          
          // Determine which steps were actually provided by the AI
          const detectedSteps: StepType[] = [];
          if (aiConfig.size) detectedSteps.push(StepType.SIZE);
          if (aiConfig.crust) detectedSteps.push(StepType.CRUST);
          if (aiConfig.cut) detectedSteps.push(StepType.CUT);
          if (aiConfig.bake) detectedSteps.push(StepType.BAKE);
          if (aiConfig.sauce) detectedSteps.push(StepType.SAUCE);
          if (aiConfig.cheeses && Object.keys(aiConfig.cheeses).length > 0) detectedSteps.push(StepType.CHEESE);
          if (aiConfig.meats && Object.keys(aiConfig.meats).length > 0) detectedSteps.push(StepType.MEATS);
          if (aiConfig.veggies && Object.keys(aiConfig.veggies).length > 0) detectedSteps.push(StepType.VEGGIES);

          // Merge with default to ensure validity for UI rendering
          setConfig({ ...defaultConfig, ...aiConfig });
          
          // Set completed steps based on what was explicitly said
          setCompletedSteps(detectedSteps);

          // Find the first step that wasn't mentioned (so user can complete the journey)
          const firstMissingStepIndex = STEPS.findIndex(s => !detectedSteps.includes(s.id));
          
          if (firstMissingStepIndex !== -1) {
             setCurrentStepIndex(firstMissingStepIndex);
             const providedLabels = detectedSteps.map(ds => STEPS.find(s => s.id === ds)?.label).filter(Boolean).join('، ');
             setVoiceMessage(providedLabels 
               ? `موارد دریافت شده: ${providedLabels}. لطفا سایر موارد را تکمیل کنید.`
               : 'متوجه جزئیات نشدیم. لطفا مراحل را تکمیل کنید.'
             );
             setView('manual');
          } else {
             // If everything was mentioned (rare), go to preview
             setVoiceMessage(null);
             setView('preview_voice');
          }

        } catch (e) {
          setVoiceError("متاسفانه متوجه سفارش شما نشدم. لطفا دوباره تلاش کنید.");
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (e) {
      setVoiceError("خطا در پردازش صدا.");
      setIsProcessing(false);
    }
  };

  // --- Handlers ---

  const handleManualStart = () => {
    setConfig(defaultConfig);
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setVoiceMessage(null);
    setView('manual');
  };

  const handleVoiceStart = () => {
    setVoiceError(null);
    setView('voice');
  };

  const handleNext = () => {
    // Validation
    if (currentStep.required) {
      let isValid = false;
      switch (currentStep.id) {
        case StepType.SIZE: isValid = !!config.size; break;
        case StepType.CRUST: isValid = !!config.crust; break;
        case StepType.CUT: isValid = !!config.cut; break;
        case StepType.BAKE: isValid = !!config.bake; break;
        default: isValid = true;
      }
      
      if (!isValid) return; // Block progress
    }

    if (!completedSteps.includes(currentStep.id)) {
      setCompletedSteps([...completedSteps, currentStep.id]);
    }

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleCheckout();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setView('landing');
    }
  };

  const handleSelection = (type: StepType, id: string) => {
    if (type === StepType.SIZE || type === StepType.CRUST || type === StepType.CUT || type === StepType.BAKE) {
       setConfig(prev => ({ ...prev, [type]: id }));
    } else if (type === StepType.SAUCE) {
       setConfig(prev => ({ ...prev, sauce: id }));
    } else {
       const category = type === StepType.CHEESE ? 'cheeses' : type === StepType.MEATS ? 'meats' : 'veggies';
       setConfig(prev => {
          const current = { ...prev[category] };
          if (current[id]) delete current[id];
          else current[id] = 'normal';
          return { ...prev, [category]: current };
       });
    }
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    const comment = await generateChefComment(config);
    const orderId = Math.floor(100000 + Math.random() * 900000).toString();
    
    const finalResult: OrderResult = {
      status: 'success',
      orderId: orderId,
      totalPrice: totals.price,
      totalCalories: totals.calories,
      aiChefComment: comment
    };

    setOrderResult(finalResult);

    // Format Message for Telegram (HTML)
    const cheeses = Object.keys(config.cheeses).map(id => findItem(CHEESES, id)?.name).join('، ');
    const meats = Object.keys(config.meats).map(id => findItem(MEATS, id)?.name).join('، ');
    const veggies = Object.keys(config.veggies).map(id => findItem(VEGGIES, id)?.name).join('، ');

    const htmlMessage = `
<b>سفارش جدید دریافت شد 🍕</b>
<code>#${orderId}</code>

<b>مشخصات پیتزا:</b>
▪️ سایز: ${findItem(SIZES, config.size)?.name}
▪️ خمیر: ${findItem(CRUSTS, config.crust)?.name}
▪️ برش: ${findItem(CUTS, config.cut)?.name}
▪️ پخت: ${config.bake === 'normal' ? 'استاندارد' : 'برشته'}
${config.sauce ? `▪️ سس: ${findItem(SAUCES, config.sauce)?.name}` : ''}

<b>مخلفات:</b>
${cheeses ? `🧀 پنیر: ${cheeses}` : '🧀 پنیر: -'}
${meats ? `🥩 گوشت: ${meats}` : '🥩 گوشت: -'}
${veggies ? `🍄 سبزیجات: ${veggies}` : '🍄 سبزیجات: -'}

<b>💰 مبلغ قابل پرداخت: ${formatPrice(totals.price)}</b>

<i>👨‍🍳 پیام سرآشپز:
${comment}</i>
`.trim();

    // Post HTML Message to Webhook
    try {
      await fetch('https://chicken-family-backend.liara.run/webhook/3577dcaa-94aa-44ba-b22d-0d4446fe2a62', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ text: htmlMessage })
      });
    } catch (err) {
      console.error("Webhook Error:", err);
    }

    setIsProcessing(false);
    setView('success');
  };

  const handleEditFromVoice = () => {
    // Go to manual mode, first step, but keep the AI generated config
    setCurrentStepIndex(0);
    setCompletedSteps(STEPS.map(s => s.id)); // Mark all as hypothetically viewed
    setView('manual');
  };

  // --- Sub-Components ---

  const ReceiptCard = () => (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gray-900 text-white p-5">
        <h3 className="font-bold text-lg flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Receipt size={22} className="text-green-400" />
             <span>فاکتور نهایی</span>
           </div>
           <span className="text-sm bg-gray-800 px-2 py-1 rounded text-gray-300 font-mono">
             {new Date().toLocaleDateString('fa-IR')}
           </span>
        </h3>
      </div>
      
      <div className="p-5 space-y-4">
         <div className="space-y-2 pb-4 border-b border-gray-100">
           <h4 className="text-sm font-bold text-gray-900 mb-3">مشخصات پایه</h4>
           <PreviewRow label="سایز نان" value={findItem(SIZES, config.size)?.name} />
           <PreviewRow label="نوع خمیر" value={findItem(CRUSTS, config.crust)?.name} />
           <PreviewRow label="برش" value={findItem(CUTS, config.cut)?.name} />
           <PreviewRow label="پخت" value={config.bake === 'normal' ? 'استاندارد' : 'برشته'} />
           {config.sauce && <PreviewRow label="سس" value={findItem(SAUCES, config.sauce)?.name} />}
         </div>
         
         <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-900 mb-2">مخلفات افزوده شده</h4>
            {[...Object.keys(config.cheeses), ...Object.keys(config.meats), ...Object.keys(config.veggies)].length === 0 ? (
               <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <span className="text-sm text-gray-400">بدون مخلفات اضافه</span>
               </div>
            ) : (
               <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                  {Object.keys(config.cheeses).map(id => <ToppingRow key={id} name={findItem(CHEESES, id)?.name} price={findItem(CHEESES, id)?.price} />)}
                  {Object.keys(config.meats).map(id => <ToppingRow key={id} name={findItem(MEATS, id)?.name} price={findItem(MEATS, id)?.price} />)}
                  {Object.keys(config.veggies).map(id => <ToppingRow key={id} name={findItem(VEGGIES, id)?.name} price={findItem(VEGGIES, id)?.price} />)}
               </div>
            )}
         </div>
      </div>

      <div className="p-5 bg-gray-50 border-t border-gray-100">
         <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600 font-medium">کالری تقریبی</span>
            <span className="text-sm text-gray-500 font-bold">{totals.calories} kcal</span>
         </div>
         <div className="flex justify-between items-center mb-0">
            <span className="text-gray-900 font-bold text-lg">مبلغ قابل پرداخت</span>
            <span className="text-xl font-black text-green-700">{formatPrice(totals.price)}</span>
         </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep.id) {
      case StepType.SIZE:
        return <div className="grid gap-4">{SIZES.map(item => <OptionCard key={item.id} item={item} isSelected={config.size === item.id} onSelect={() => handleSelection(StepType.SIZE, item.id)} />)}</div>;
      case StepType.CRUST:
        return <div className="grid gap-4">{CRUSTS.map(item => { if (item.isCompatibleWith && !item.isCompatibleWith(config)) return null; return <OptionCard key={item.id} item={item} isSelected={config.crust === item.id} onSelect={() => handleSelection(StepType.CRUST, item.id)} />; })}</div>;
      case StepType.CUT:
        return <div className="grid gap-4">{CUTS.map(item => <OptionCard key={item.id} item={item} isSelected={config.cut === item.id} onSelect={() => handleSelection(StepType.CUT, item.id)} />)}</div>;
      case StepType.SAUCE:
         return <div className="grid gap-4">{SAUCES.map(item => <OptionCard key={item.id} item={item} isSelected={config.sauce === item.id} onSelect={() => handleSelection(StepType.SAUCE, item.id)} />)}</div>;
      case StepType.BAKE:
        return <div className="grid md:grid-cols-2 gap-4">
             {[{id: 'normal', name: 'پخت استاندارد', description: 'پخت کامل و یکدست', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=300&fit=crop', price: 0, calories: 0},
               {id: 'well_done', name: 'برشته (Well Done)', description: 'پنیر طلایی و نان تردتر', image: 'https://images.unsplash.com/photo-1595854341625-f5783195536e?w=300&h=300&fit=crop', price: 0, calories: 0}
             ].map(item => <OptionCard key={item.id} item={item as MenuItem} isSelected={config.bake === item.id} onSelect={() => handleSelection(StepType.BAKE, item.id)} />)}
          </div>;
      case StepType.CHEESE:
      case StepType.MEATS:
      case StepType.VEGGIES:
        const list = currentStep.id === StepType.CHEESE ? CHEESES : currentStep.id === StepType.MEATS ? MEATS : VEGGIES;
        const key = currentStep.id === StepType.CHEESE ? 'cheeses' : currentStep.id === StepType.MEATS ? 'meats' : 'veggies';
        return <div className="grid gap-4">{list.map(item => <OptionCard key={item.id} item={item} isSelected={!!config[key][item.id]} isMultiSelect={true} onSelect={() => handleSelection(currentStep.id, item.id)} onRemove={() => handleSelection(currentStep.id, item.id)} />)}</div>;
      default: return null;
    }
  };

  // --- Views ---

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6" dir="rtl">
        <h1 className="text-4xl font-black text-gray-900 mb-2">پیتزاساز هوشمند</h1>
        <p className="text-gray-500 mb-12 text-center max-w-md">روش سفارش خود را انتخاب کنید. می‌توانید با دستیار صوتی صحبت کنید یا پیتزا را دستی بسازید.</p>
        
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
           <button 
             onClick={handleVoiceStart}
             className="group relative overflow-hidden bg-gray-900 hover:bg-black text-white p-8 rounded-3xl shadow-xl transition-all hover:scale-[1.02] flex flex-col items-center text-center gap-4"
           >
             <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-pulse">
               <Mic size={40} className="text-white" />
             </div>
             <div>
               <h3 className="text-2xl font-black mb-2">دستیار صوتی هوشمند</h3>
               <p className="text-gray-400 text-sm">سفارش با گفتار به زبان فارسی</p>
             </div>
           </button>

           <button 
             onClick={handleManualStart}
             className="group bg-white hover:bg-gray-50 text-gray-900 p-8 rounded-3xl shadow-xl border border-gray-100 transition-all hover:scale-[1.02] flex flex-col items-center text-center gap-4"
           >
             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
               <Edit2 size={32} className="text-gray-600" />
             </div>
             <div>
               <h3 className="text-2xl font-black mb-2">ساخت دستی پیتزا</h3>
               <p className="text-gray-500 text-sm">انتخاب مرحله به مرحله مواد</p>
             </div>
           </button>
        </div>
      </div>
    );
  }

  if (view === 'voice') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden" dir="rtl">
        <div className="z-10 max-w-md w-full">
           <div className="mb-8">
             <h2 className="text-3xl font-black mb-4">چه پیتزایی میل دارید؟</h2>
             <p className="text-gray-400">مثلا بگویید: "یک پیتزا پپرونی بزرگ با خمیر نازک و پنیر اضافه"</p>
           </div>

           <div className="relative mx-auto w-32 h-32 mb-8 flex items-center justify-center">
             {isRecording && (
               <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
             )}
             <button
               onClick={isRecording ? stopRecording : startRecording}
               disabled={isProcessing}
               className={`
                 relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl
                 ${isRecording ? 'bg-red-500 hover:bg-red-600 scale-110' : 'bg-green-600 hover:bg-green-500'}
                 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
               `}
             >
               {isProcessing ? (
                 <Loader2 size={40} className="animate-spin" />
               ) : isRecording ? (
                 <Square size={32} fill="currentColor" />
               ) : (
                 <Mic size={40} />
               )}
             </button>
           </div>

           <p className="text-lg font-bold mb-8 h-8">
             {isProcessing ? 'هوش مصنوعی در حال تحلیل...' : isRecording ? 'در حال شنیدن...' : 'برای شروع صحبت کنید'}
           </p>

           {voiceError && (
             <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6">
               {voiceError}
             </div>
           )}

           <button onClick={() => setView('landing')} className="text-gray-500 hover:text-white transition-colors">
             انصراف و بازگشت
           </button>
        </div>
      </div>
    );
  }

  if (view === 'preview_voice') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center" dir="rtl">
         <div className="max-w-lg w-full">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold mb-4">
                 <CheckCircle size={16} />
                 <span>سفارش شما تحلیل شد</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900">آیا این سفارش صحیح است؟</h2>
            </div>

            <ReceiptCard />

            <div className="flex gap-4 mt-6">
               <button 
                 onClick={handleEditFromVoice}
                 className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 flex items-center justify-center gap-2"
               >
                 <Edit2 size={18} />
                 <span>ویرایش جزئیات</span>
               </button>
               <button 
                 onClick={handleCheckout}
                 className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2"
               >
                 <span>تایید و پرداخت</span>
                 <ArrowLeft size={18} />
               </button>
            </div>
         </div>
      </div>
    );
  }

  if (view === 'success' && orderResult) {
     return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
           <div className="max-w-md w-full space-y-6 animate-scaleIn">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-green-100 shadow-xl">
                 <CheckCircle size={48} className="text-green-600" />
              </div>
              <div>
                 <h1 className="text-3xl font-black text-gray-900 mb-2">سفارش موفق!</h1>
                 <p className="text-gray-500">شماره سفارش شما</p>
                 <div className="text-2xl font-mono font-bold text-gray-800 mt-1">#{orderResult.orderId}</div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-right shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-1 h-full bg-orange-500"></div>
                 <div className="flex items-center gap-2 mb-3">
                    <Flame size={18} className="text-orange-500" />
                    <span className="font-bold text-gray-800">پیام سرآشپز هوشمند:</span>
                 </div>
                 <p className="text-gray-700 leading-relaxed font-medium">"{orderResult.aiChefComment}"</p>
              </div>

              <div className="flex justify-between items-center py-4 border-b border-t border-gray-100">
                 <span className="text-gray-600">مبلغ پرداخت شده</span>
                 <span className="font-black text-xl text-green-700">{formatPrice(orderResult.totalPrice)}</span>
              </div>

              <button 
                onClick={() => setView('landing')}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-[0.98]"
              >
                 بازگشت به خانه
              </button>
           </div>
        </div>
     );
  }

  // --- Manual Builder View ---
  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-32 md:pb-0" dir="rtl">
       
       <div className="fixed top-0 left-0 right-0 h-1.5 bg-gray-200 z-50">
          <div 
             className="h-full bg-green-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(22,163,74,0.5)]"
             style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          ></div>
       </div>

       <header className="bg-white px-4 py-4 sticky top-1.5 z-30 shadow-sm md:hidden flex items-center justify-between border-b border-gray-100">
          <button onClick={() => setView('landing')} className="p-1"><ArrowRight size={20} className="text-gray-600"/></button>
          <span className="font-black text-lg text-gray-800">ساخت پیتزا</span>
          <div className="text-sm font-bold text-gray-500">
             {currentStepIndex + 1}/{STEPS.length}
          </div>
       </header>

       <StepNavigator currentStep={currentStep.id} completedSteps={completedSteps} />

       <main className="max-w-6xl mx-auto px-4 py-8">
          {voiceMessage && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 animate-fadeIn">
               <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
               <p className="text-blue-800 text-sm font-medium leading-relaxed">{voiceMessage}</p>
            </div>
          )}

          <div className="md:grid md:grid-cols-12 md:gap-8 items-start">
             
             <div className="md:col-span-7 lg:col-span-8">
                <div className="mb-6 flex items-end justify-between">
                   <div>
                     <h2 className="text-3xl font-black text-gray-900 mb-2">{currentStep.label}</h2>
                     <p className="text-gray-500">
                        {currentStep.required 
                          ? 'یکی از گزینه‌های زیر را انتخاب کنید' 
                          : 'انتخاب این مرحله اختیاری است'}
                     </p>
                   </div>
                </div>

                <div className="min-h-[300px] mb-8">
                   {renderStepContent()}
                </div>

                <div className="hidden md:flex items-center justify-between mt-10 pt-6 border-t border-gray-200">
                   <button 
                      onClick={handleBack}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors text-gray-600 hover:bg-gray-100"
                   >
                      <ArrowRight size={20} />
                      <span>{currentStepIndex === 0 ? 'بازگشت به خانه' : 'مرحله قبل'}</span>
                   </button>

                   <button 
                      onClick={handleNext}
                      className="bg-green-600 hover:bg-green-700 text-white px-10 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-200 transition-transform active:scale-[0.98]"
                   >
                      <span>
                         {currentStepIndex === STEPS.length - 1 ? 'تایید و پرداخت' : 'مرحله بعد'}
                      </span>
                      {currentStepIndex !== STEPS.length - 1 && <ArrowLeft size={20} />}
                   </button>
                </div>
             </div>

             <div className="hidden md:block md:col-span-5 lg:col-span-4 sticky top-24">
                <ReceiptCard />
             </div>

          </div>
       </main>

       <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-4">
             <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-0.5">مبلغ قابل پرداخت</span>
                <span className="font-black text-xl text-gray-900">{formatPrice(totals.price)}</span>
             </div>
          </div>

          <div className="flex gap-3">
             <button 
                onClick={handleBack}
                className="w-14 h-14 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 active:scale-95 transition-transform"
             >
                <ArrowRight size={24} />
             </button>
             
             <button 
                onClick={handleNext}
                disabled={isProcessing}
                className="flex-1 bg-green-600 text-white rounded-xl font-bold py-3 flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-[0.98] transition-all"
             >
                {isProcessing && <Loader2 className="animate-spin" size={20} />}
                <span>{currentStepIndex === STEPS.length - 1 ? 'تکمیل خرید' : 'ادامه'}</span>
                {!isProcessing && currentStepIndex !== STEPS.length - 1 && <ChevronLeft size={20} />}
             </button>
          </div>
       </div>

    </div>
  );
}