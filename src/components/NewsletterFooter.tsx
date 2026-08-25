import React from 'react';
import { Send, Instagram, Youtube, MessageCircle } from 'lucide-react';
import { StoreConfig } from '../types';

interface NewsletterFooterProps {
  storeConfig: StoreConfig;
}

export const NewsletterFooter: React.FC<NewsletterFooterProps> = ({ storeConfig }) => {
  // Safe fallback URLs
  const instagramUrl = storeConfig.instagramUrl || 'https://instagram.com/neetmbbsdoctors';
  const youtubeUrl = storeConfig.youtubeUrl || 'https://youtube.com/@neetmbbsdoctors';
  const telegramUrl = storeConfig.telegramUrl || storeConfig.telegramLink || 'https://t.me/neetmbbsdoctors';
  const whatsappUrl = storeConfig.whatsappUrl || (storeConfig.whatsappNumber ? `https://wa.me/${storeConfig.whatsappNumber.replace(/[^0-9]/g, '')}` : 'https://wa.me/916005894110');

  return (
    <div id="newsletter-social-footer" className="pt-2 pb-2">
      {/* Sleek Social Media Connect Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-3 sm:p-3.5 shadow-xs border border-blue-900/40 flex items-center justify-between gap-2">
        <div className="space-y-0.5 min-w-0 pr-1">
          <h4 className="text-xs font-black text-white font-['Outfit',sans-serif] tracking-wide flex items-center gap-1.5">
            <span>Connect With Us</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </h4>
          <p className="text-[9.5px] text-blue-200/80 truncate">
            Official NEET UG study channels & updates
          </p>
        </div>

        {/* Social Media Icons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Instagram */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-transform"
            title="Follow on Instagram"
            aria-label="Instagram"
          >
            <Instagram className="w-3.5 h-3.5" />
          </a>

          {/* YouTube */}
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-full bg-[#ff0000] text-white flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-transform"
            title="Subscribe on YouTube"
            aria-label="YouTube"
          >
            <Youtube className="w-3.5 h-3.5" />
          </a>

          {/* Telegram */}
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-full bg-[#229ed9] text-white flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-transform"
            title="Join on Telegram"
            aria-label="Telegram"
          >
            <Send className="w-3.5 h-3.5 translate-x-[-0.5px] translate-y-[0.5px]" />
          </a>

          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-full bg-[#25d366] text-white flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-transform"
            title="Chat on WhatsApp"
            aria-label="WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
