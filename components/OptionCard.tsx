import React from 'react';
import { MenuItem } from '../types';
import { Plus, Check, Minus } from 'lucide-react';
import { formatPrice } from '../constants';

interface OptionCardProps {
  item: MenuItem;
  isSelected: boolean;
  onSelect: () => void;
  // For multi-select items (toppings)
  isMultiSelect?: boolean;
  onRemove?: () => void;
}

export const OptionCard: React.FC<OptionCardProps> = ({ 
  item, 
  isSelected, 
  onSelect,
  isMultiSelect = false,
  onRemove
}) => {
  return (
    <div 
      onClick={!isSelected ? onSelect : undefined}
      className={`
        relative group flex items-start gap-4 p-4 rounded-2xl transition-all duration-300
        ${isSelected 
          ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-green-500 ring-1 ring-green-500' 
          : 'bg-white shadow-sm border border-gray-100 hover:border-gray-200 hover:shadow-md cursor-pointer'
        }
      `}
    >
      {/* Image */}
      <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-[6rem] justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{item.description}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-3">
           <span className="text-gray-900 font-bold">
             {item.price > 0 ? formatPrice(item.price) : 'رایگان'}
           </span>
           
           {/* Action Button */}
           <div className="flex items-center">
              {isSelected ? (
                 isMultiSelect && onRemove ? (
                   <div className="flex items-center gap-3">
                     <button 
                       onClick={(e) => { e.stopPropagation(); onRemove(); }}
                       className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                     >
                       <Minus size={16} />
                     </button>
                     <span className="font-bold text-green-600 text-sm">انتخاب شد</span>
                   </div>
                 ) : (
                   <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-200">
                     <Check size={16} strokeWidth={3} />
                   </div>
                 )
              ) : (
                <button className="w-8 h-8 rounded-full border border-gray-200 text-gray-400 flex items-center justify-center group-hover:border-green-500 group-hover:text-green-500 transition-all">
                   <Plus size={18} />
                </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
