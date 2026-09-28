import React, { useState, useEffect } from 'react';
import { X, Mail, Headphones, Send, CheckCircle2, MessageSquare, Phone, User, Sparkles, MessageCircle } from 'lucide-react';
import { addSupportMessage, getStoredStoreConfig } from '../lib/storage';
import { SupportMessage, UserProfile, StoreConfig } from '../types';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, userProfile }) => {
  const [name, setName] = useState(userProfile?.displayName || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [phone, setPhone] = useState(userProfile?.phoneNumber || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getStoredStoreConfig());

  useEffect(() => {
    setStoreConfig(getStoredStoreConfig());
    const handleUpdate = () => setStoreConfig(getStoredStoreConfig());
    window.addEventListener('neetmbbs_store_config_updated', handleUpdate);
    return () => window.removeEventListener('neetmbbs_store_config_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.displayName && !name) setName(userProfile.displayName);
      if (userProfile.email && !email) setEmail(userProfile.email);
      if (userProfile.phoneNumber && !phone) setPhone(userProfile.phoneNumber);
    }
  }, [userProfile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setIsSubmitting(true);

    const newMsg: SupportMessage = {
      id: `MSG-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      subject: subject.trim() || 'General Inquiry',
      message: message.trim(),
      createdAt: new Date().toISOString(),
      status: 'unread'
    };

    // Save to persistent storage for Admin Panel
    addSupportMessage(newMsg);

    // Send instant Telegram support alert to Admin 7004282468 via dedicated bot
    const dedicatedBotToken = '7532901077:AAFNXAFmL6tp7k81HVskKJZuRoyHP3fe2qQ';
    
    const escapeTg = (str?: string) => {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    const alertText = 
`💬 <b>NEW CUSTOMER SUPPORT MESSAGE</b>
👤 <b>Name:</b> ${escapeTg(newMsg.name)}
📧 <b>Email:</b> ${escapeTg(newMsg.email)}
📞 <b>Phone:</b> ${escapeTg(newMsg.phone || 'Not provided')}
📌 <b>Subject:</b> ${escapeTg(newMsg.subject)}
📝 <b>Message:</b>
${escapeTg(newMsg.message)}
🆔 <b>Ticket ID:</b> #${newMsg.id}`;

    if (dedicatedBotToken) {
      fetch(`https://api.telegram.org/bot${dedicatedBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '7004282468',
          text: alertText,
          parse_mode: 'HTML'
        })
      }).catch(err => console.warn('Dedicated support telegram error:', err));
    }

    setIsSubmitting(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setSubject('');
      setMessage('');
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="support-modal"
        className="bg-white text-slate-900 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col"
      >
        <div className="bg-[#070e1e] text-white p-3.5 px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-sm">24/7 Aspirant Support</h3>
              <p className="text-[10px] text-slate-400">Direct Doctor & Admin Helpline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Direct Emails & Phone info */}
          <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl space-y-1.5 text-slate-800">
            <span className="font-black text-amber-900 block text-[11px]">
              Direct Store & Admin Helpline:
            </span>
            <div className="space-y-1 font-mono text-[10px]">
              {storeConfig.supportEmails.filter(Boolean).map((email, idx) => (
                <a
                  key={idx}
                  href={`mailto:${email}`}
                  className="flex items-center gap-1.5 text-slate-900 font-bold hover:text-amber-700 transition"
                >
                  <Mail className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>{email}</span>
                </a>
              ))}
              {storeConfig.supportPhones.filter(Boolean).map((phone, idx) => (
                <a
                  key={idx}
                  href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center gap-1.5 text-slate-900 font-bold hover:text-amber-700 transition"
                >
                  <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>{phone}</span>
                </a>
              ))}
              {storeConfig.whatsappNumber && (
                <a
                  href={`https://wa.me/${storeConfig.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-emerald-800 font-bold hover:text-emerald-900 transition"
                >
                  <MessageCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>WhatsApp: {storeConfig.whatsappNumber}</span>
                </a>
              )}
            </div>
          </div>

          {sent ? (
            <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-black text-slate-900 text-sm">Message Sent to Admin!</h4>
              <p className="text-slate-600 text-xs">
                Our support team will contact you directly via Email or Phone shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-700 block text-[10px]">Your Name *</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="font-bold text-slate-700 block text-[10px]">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="font-bold text-slate-700 block text-[10px]">Your Email *</label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-0.5">
                <label className="font-bold text-slate-700 block text-[10px]">Subject / Order ID</label>
                <input
                  type="text"
                  placeholder="e.g. PDF Access / Delivery Enquiry"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-0.5">
                <label className="font-bold text-slate-700 block text-[10px]">How can we help you? *</label>
                <textarea
                  rows={3}
                  placeholder="Describe your issue or query..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-75"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Sending...' : 'Send Message to Admin'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

