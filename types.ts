export enum StepType {
  SIZE = 'size',
  CRUST = 'crust',
  CUT = 'cut',
  SAUCE = 'sauce',
  BAKE = 'bake',
  CHEESE = 'cheese',
  MEATS = 'meats',
  VEGGIES = 'veggies',
  REVIEW = 'review'
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number; // In Toman
  calories: number;
  image: string;
  isCompatibleWith?: (currentConfig: PizzaConfiguration) => boolean;
}

export interface ToppingItem extends MenuItem {
  type: 'meat' | 'veggie' | 'cheese' | 'sauce';
}

export interface PizzaConfiguration {
  size: string;
  crust: string;
  cut: string;
  sauce: string | null; // Can be skipped
  sauceAmount: 'light' | 'normal' | 'extra';
  bake: 'normal' | 'well_done';
  cheeses: Record<string, 'light' | 'normal' | 'extra'>;
  meats: Record<string, 'light' | 'normal' | 'extra'>;
  veggies: Record<string, 'light' | 'normal' | 'extra'>;
}

export interface OrderResult {
  status: 'success' | 'error';
  orderId?: string;
  aiChefComment?: string;
  totalPrice: number;
  totalCalories: number;
}
