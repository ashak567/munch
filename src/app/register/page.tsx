'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { signup } from '@/app/auth/actions'
import { createClient } from '@/utils/supabase/client'
import { ArrowRight, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'
import Mascot from '@/components/Mascot'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

type RegisterInputs = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInputs>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterInputs) => {
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('email', data.email)
      formData.append('password', data.password)

      const result = await signup(null, formData)

      if (result?.error) {
        setErrorMsg(result.error)
      } else if (result?.success) {
        setSuccessMsg(result.message || 'Registration successful! Please confirm your email.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setErrorMsg(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,\n        },\n      })\n      if (error) throw error\n    } catch (err: any) {\n      setErrorMsg(err.message || 'Failed to initialize Google login.')\n      setGoogleLoading(false)\n    }\n  }\n\n  return (\n    <div className=\"flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto w-full\">\n      {/* Brand Header */}\n      <div className=\"text-center mb-6\">\n        <Link href=\"/\" className=\"inline-flex items-center gap-2 mb-2\">\n          <span className=\"text-4xl animate-float\">🍀</span>\n          <span className=\"font-display text-3xl font-bold tracking-tight text-primary-dark\">\n            MunchPick\n          </span>\n        </Link>\n        <p className=\"text-sm text-charcoal/70\">\n          Let's get you set up to start picking!\n        </p>\n      </div>\n\n      {/* Main Glass Card */}\n      <div className=\"glass-panel rounded-3xl p-8 shadow-xl\">\n        {/* Mascot Greeting */}\n        <div className=\"flex items-center gap-4 bg-white/50 border border-white/60 rounded-2xl p-4 mb-6 relative overflow-hidden\">\n          <Mascot character=\"general\" expression=\"happy\" size=\"sm\" className=\"flex-shrink-0\" />\n          <div className=\"flex-1\">\n            <h4 className=\"font-display font-bold text-sm text-charcoal\">Munch says...</h4>\n            <p className=\"text-xs text-charcoal/80 leading-snug\">\n              \"Indecision is just a phase! Create an account and let's cure decision fatigue together!\"\n            </p>\n          </div>\n        </div>\n\n        {/* Success & Error Banners */}\n        {errorMsg && (\n          <div className=\"flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700\">\n            <AlertCircle className=\"w-4 h-4 flex-shrink-0 mt-0.5\" />\n            <span>{errorMsg}</span>\n          </div>\n        )}\n\n        {successMsg && (\n          <div className=\"flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-xs text-green-700\">\n            <CheckCircle className=\"w-4 h-4 flex-shrink-0 mt-0.5\" />\n            <span>{successMsg}</span>\n          </div>\n        )}\n\n        {/* Registration Form */}\n        {!successMsg && (\n          <form onSubmit={handleSubmit(onSubmit)} className=\"space-y-4\">\n            {/* Name */}\n            <div>\n              <label className=\"block text-xs font-semibold text-charcoal/70 mb-1\">\n                Full Name\n              </label>\n              <div className=\"relative\">\n                <div className=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-charcoal/40\">\n                  <User className=\"w-4 h-4\" />\n                </div>\n                <input\n                  {...register('name')}\n                  type=\"text\"\n                  placeholder=\"e.g. Mia Alist\"\n                  className={`block w-full pl-9 pr-3 py-2 border rounded-xl bg-white/80 backdrop-blur-sm text-sm placeholder-charcoal/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary-dark ${\n                    errors.name ? 'border-red-300' : 'border-white/80'\n                  }`}\n                />\n              </div>\n              {errors.name && (\n                <span className=\"block text-2xs text-red-500 mt-1 pl-1\">\n                  {errors.name.message}\n                </span>\n              )}\n            </div>\n\n            {/* Email */}\n            <div>\n              <label className=\"block text-xs font-semibold text-charcoal/70 mb-1\">\n                Email Address\n              </label>\n              <div className=\"relative\">\n                <div className=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-charcoal/40\">\n                  <Mail className=\"w-4 h-4\" />\n                </div>\n                <input\n                  {...register('email')}\n                  type=\"email\"\n                  placeholder=\"e.g. mia@munchpick.com\"\n                  className={`block w-full pl-9 pr-3 py-2 border rounded-xl bg-white/80 backdrop-blur-sm text-sm placeholder-charcoal/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary-dark ${\n                    errors.email ? 'border-red-300' : 'border-white/80'\n                  }`}\n                />\n              </div>\n              {errors.email && (\n                <span className=\"block text-2xs text-red-500 mt-1 pl-1\">\n                  {errors.email.message}\n                </span>\n              )}\n            </div>\n\n            {/* Password */}\n            <div>\n              <label className=\"block text-xs font-semibold text-charcoal/70 mb-1\">\n                Password\n              </label>\n              <div className=\"relative\">\n                <div className=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-charcoal/40\">\n                  <Lock className=\"w-4 h-4\" />\n                </div>\n                <input\n                  {...register('password')}\n                  type=\"password\"\n                  placeholder=\"••••••••\"\n                  className={`block w-full pl-9 pr-3 py-2 border rounded-xl bg-white/80 backdrop-blur-sm text-sm placeholder-charcoal/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary-dark ${\n                    errors.password ? 'border-red-300' : 'border-white/80'\n                  }`}\n                />\n              </div>\n              {errors.password && (\n                <span className=\"block text-2xs text-red-500 mt-1 pl-1\">\n                  {errors.password.message}\n                </span>\n              )}\n            </div>\n\n            {/* Submit Button */}\n            <button\n              type=\"submit\"\n              disabled={loading || googleLoading}\n              className=\"w-full py-2.5 px-4 btn-clay-primary text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed\"\n            >\n              {loading ? 'Creating Account...' : 'Sign Up'}\n              <ArrowRight className=\"w-4 h-4\" />\n            </button>\n          </form>\n        )}\n\n        {/* Divider */}\n        {!successMsg && (\n          <div className=\"relative my-6\">\n            <div className=\"absolute inset-0 flex items-center\">\n              <div className=\"w-full border-t border-charcoal/10\" />\n            </div>\n            <div className=\"relative flex justify-center text-xs\">\n              <span className=\"px-3 bg-[#FFFBF9] text-charcoal/40\">or continue with</span>\n            </div>\n          </div>\n        )}\n\n        {/* Google OAuth Button */}\n        {!successMsg && (\n          <button\n            onClick={handleGoogleLogin}\n            disabled={loading || googleLoading}\n            type=\"button\"\n            className=\"w-full py-2.5 px-4 border-2 border-charcoal/10 rounded-2xl bg-white hover:bg-charcoal/5 active:bg-charcoal/10 text-charcoal font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-50\"\n          >\n            <svg viewBox=\"0 0 24 24\" className=\"w-5 h-5 flex-shrink-0\">\n              <path\n                d=\"M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z\"\n                fill=\"#4285F4\"\n              />\n              <path\n                d=\"M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z\"\n                fill=\"#34A853\"\n              />\n              <path\n                d=\"M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z\"\n                fill=\"#FBBC05\"\n              />\n              <path\n                d=\"M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z\"\n                fill=\"#EA4335\"\n              />\n            </svg>\n            {googleLoading ? 'Signing In...' : 'Google'}\n          </button>\n        )}\n\n        {/* Toggle Login link */}\n        <p className=\"text-center text-xs text-charcoal/60 mt-6\">\n          Already have an account?{' '}\n          <Link href=\"/login\" className=\"font-bold text-secondary-dark hover:underline\">\n            Log In\n          </Link>\n        </p>\n      </div>\n    </div>\n  )\n}
