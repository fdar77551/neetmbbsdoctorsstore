import React from 'react';
import { ShieldCheck, Users, Award, Headphones } from 'lucide-react';

interface TrustBadgesProps {
  onSupportClick: () => void;
}

export const TrustBadges: React.FC<TrustBadgesProps> = ({ onSupportClick }) => {
  return (
    <div id="trust-badges-section" className="py-2">
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100/80 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-left">
          {/* Badge 1 */}
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 leading-tight">
                Trusted by 1.75L+
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">NEET Aspirants</p>
            </div>
          </div>

          {/* Badge 2 */}
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 leading-tight">
                100% Authentic
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">Verified Content</p>
            </div>
          </div>

          {/* Badge 3 */}
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Award className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 leading-tight">
                Top Quality
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">Doctor Verified</p>
            </div>
          </div>

          {/* Badge 4 */}
          <div 
            onClick={onSupportClick}
            className="flex items-start gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 flex items-center justify-center shrink-0 shadow-2xs transition">
              <Headphones className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition leading-tight">
                Dedicated Support
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">Always Here to Help</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
