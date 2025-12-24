import { MenuItem, ToppingItem, StepType } from './types';

export const STEPS = [
  { id: StepType.SIZE, label: 'سایز نان', required: true },
  { id: StepType.CRUST, label: 'نوع خمیر', required: true },
  { id: StepType.CUT, label: 'مدل برش', required: true },
  { id: StepType.SAUCE, label: 'سس پایه', required: false },
  { id: StepType.BAKE, label: 'نوع پخت', required: true },
  { id: StepType.CHEESE, label: 'پنیر', required: false },
  { id: StepType.MEATS, label: 'گوشت', required: false },
  { id: StepType.VEGGIES, label: 'سبزیجات', required: false },
];

// Helper for formatting prices
export const formatPrice = (price: number) => {
  return price === 0 ? 'رایگان' : `${price.toLocaleString('fa-IR')} تومان`;
};

export const SIZES: MenuItem[] = [
  {
    id: 'small',
    name: 'یک نفره (S)',
    description: '۴ تکه - ۲۰ سانتی‌متر',
    price: 180000,
    calories: 800,
    image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=400&h=400&fit=crop'
  },
  {
    id: 'medium',
    name: 'دو نفره (M)',
    description: '۶ تکه - ۲۸ سانتی‌متر',
    price: 260000,
    calories: 1400,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop'
  },
  {
    id: 'large',
    name: 'خانواده (L)',
    description: '۸ تکه - ۳۵ سانتی‌متر',
    price: 340000,
    calories: 2200,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop'
  }
];

export const CRUSTS: MenuItem[] = [
  {
    id: 'original',
    name: 'کلاسیک (ضخیم)',
    description: 'بافت نرم و اصیل ایتالیایی',
    price: 0,
    calories: 0,
    image: 'https://images.unsplash.com/photo-1574126154517-d1e0d89e7344?w=400&h=400&fit=crop'
  },
  {
    id: 'thin',
    name: 'نازک (ایتالیایی)',
    description: 'ترد و برشته',
    price: 0,
    calories: -100,
    image: 'https://images.unsplash.com/photo-1571407970349-bc16f69910d9?w=400&h=400&fit=crop'
  },
  {
    id: 'stuffed',
    name: 'دور پنیر (Gold)',
    description: 'لبه‌های پر شده با پنیر گودا',
    price: 45000,
    calories: 300,
    image: 'https://images.unsplash.com/photo-1620374645310-f9d97e733268?w=400&h=400&fit=crop',
    isCompatibleWith: (config) => config.size !== 'small'
  }
];

export const CUTS: MenuItem[] = [
  { id: 'normal', name: 'مثلثی کلاسیک', description: 'برش استاندارد پیتزا', price: 0, calories: 0, image: 'https://cdn-icons-png.flaticon.com/512/1404/1404945.png' },
  { id: 'square', name: 'مربعی (پارتی)', description: 'تکه‌های کوچک مربعی', price: 0, calories: 0, image: 'https://cdn-icons-png.flaticon.com/512/4825/4825292.png' },
  { id: 'clean', name: 'بدون برش', description: 'پیتزا کامل سرو می‌شود', price: 0, calories: 0, image: 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png' },
];

export const SAUCES: ToppingItem[] = [
  { id: 'tomato', name: 'مارینارا (گوجه)', type: 'sauce', price: 0, calories: 20, image: 'https://images.unsplash.com/photo-1590483427961-455b5d153163?w=200&h=200&fit=crop' },
  { id: 'alfredo', name: 'آلفردو (سیر و خامه)', type: 'sauce', price: 25000, calories: 120, image: 'https://images.unsplash.com/photo-1626202158866-9e1cc6439977?w=200&h=200&fit=crop' },
  { id: 'bbq', name: 'باربیکیو دودی', type: 'sauce', price: 15000, calories: 45, image: 'https://images.unsplash.com/photo-1633333320268-9122c6080e77?w=200&h=200&fit=crop' },
];

export const CHEESES: ToppingItem[] = [
  { id: 'mozzarella', name: 'موزارلا تازه', type: 'cheese', price: 40000, calories: 150, image: 'https://images.unsplash.com/photo-1634509426315-782806877987?w=200&h=200&fit=crop' },
  { id: 'gorgonzola', name: 'گورگونزولا (کپکی)', type: 'cheese', price: 55000, calories: 180, image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop' },
  { id: 'mix', name: 'میکس پنیرها', type: 'cheese', price: 60000, calories: 200, image: 'https://images.unsplash.com/photo-1621659911217-1f95a4c5853a?w=200&h=200&fit=crop' },
];

export const MEATS: ToppingItem[] = [
  { id: 'pepperoni', name: 'پپرونی ۹۰٪', type: 'meat', price: 55000, calories: 200, image: 'https://images.unsplash.com/photo-1625938145744-e38051524294?w=200&h=200&fit=crop' },
  { id: 'steak', name: 'راسته گوساله', type: 'meat', price: 95000, calories: 180, image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=200&h=200&fit=crop' },
  { id: 'chicken', name: 'مرغ گریل شده', type: 'meat', price: 45000, calories: 140, image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=200&h=200&fit=crop' },
  { id: 'bacon', name: 'بیکن دودی', type: 'meat', price: 65000, calories: 250, image: 'https://images.unsplash.com/photo-1607328696884-2458c9735d49?w=200&h=200&fit=crop' },
];

export const VEGGIES: ToppingItem[] = [
  { id: 'mushroom', name: 'قارچ اسلایس', type: 'veggie', price: 20000, calories: 15, image: 'https://images.unsplash.com/photo-1504953285093-68e169a83eb9?w=200&h=200&fit=crop' },
  { id: 'olive', name: 'زیتون سیاه', type: 'veggie', price: 25000, calories: 30, image: 'https://images.unsplash.com/photo-1634547902787-849a60e6530a?w=200&h=200&fit=crop' },
  { id: 'pepper', name: 'فلفل دلمه‌ای', type: 'veggie', price: 15000, calories: 10, image: 'https://images.unsplash.com/photo-1563715830026-6a2c20847250?w=200&h=200&fit=crop' },
  { id: 'corn', name: 'ذرت شیرین', type: 'veggie', price: 20000, calories: 50, image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=200&h=200&fit=crop' },
];

export const AMOUNT_LABELS = {
  light: 'کم',
  normal: 'استاندارد',
  extra: 'زیاد'
};
