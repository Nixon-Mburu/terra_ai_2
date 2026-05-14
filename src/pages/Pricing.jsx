import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Zap, Shield, FileText } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'KES 2,500',
    period: 'per report',
    desc: 'Perfect for individual buyers making one-time decisions.',
    icon: Zap,
    color: 'border-terra-border',
    badge: null,
    features: [
      'Vision AI scan (1 image)',
      'Basic risk score',
      'Elevation & slope data',
      'Standard PDF report',
      '3 critical flags max',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 'KES 7,500',
    period: 'per report',
    desc: 'For agents and developers who need the full picture.',
    icon: Shield,
    color: 'border-emerald-400',
    badge: 'Most Popular',
    features: [
      'Vision AI scan + annotations',
      'Full spatial engine analysis',
      'Riparian buffer calculation',
      'Zoning cross-reference',
      'Unlimited critical flags',
      'Enterprise PDF (3 pages)',
      'AI Chat assistant',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: 'monthly subscription',
    desc: 'For real estate firms needing bulk analysis and white-labelling.',
    icon: FileText,
    color: 'border-indigo-400',
    badge: null,
    features: [
      'Everything in Professional',
      'Bulk analysis (unlimited plots)',
      'White-label PDF reports',
      'API access',
      'Priority support',
      'Custom data integrations',
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-terra-heading mb-4">
            Invest in certainty
          </h1>
          <p className="text-terra-body max-w-xl mx-auto text-lg">
            One Terra AI report costs less than a single hour of a traditional surveyor's time — and delivers more data.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map(({ id, name, price, period, desc, icon: Icon, color, badge, features }, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative bg-white rounded-3xl border-2 ${color} p-8 flex flex-col shadow-sm hover:shadow-xl transition-all duration-300`}
            >
              {badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                  {badge}
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${id === 'professional' ? 'bg-emerald-500' : id === 'enterprise' ? 'bg-indigo-500' : 'bg-slate-100'}`}>
                  <Icon className={`w-5 h-5 ${id === 'starter' ? 'text-slate-500' : 'text-white'}`} />
                </div>
                <h2 className="text-lg font-bold text-terra-heading">{name}</h2>
              </div>

              <div className="mb-2">
                <span className="text-4xl font-black text-terra-heading">{price}</span>
                <span className="text-terra-muted text-sm ml-2">/ {period}</span>
              </div>
              <p className="text-terra-body text-sm mb-8">{desc}</p>

              <ul className="space-y-3 flex-1 mb-8">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-terra-body">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                fullWidth
                variant={id === 'professional' ? 'primary' : id === 'enterprise' ? 'indigo' : 'secondary'}
                iconRight={ArrowRight}
                onClick={() => navigate('/analyze')}
              >
                {id === 'enterprise' ? 'Contact Sales' : 'Get Started'}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-center text-terra-muted text-sm mt-12"
        >
          All reports include the legal disclaimer required for exploratory due diligence. Payments simulated — no real charges.
        </motion.p>
      </div>
    </MainLayout>
  );
}
