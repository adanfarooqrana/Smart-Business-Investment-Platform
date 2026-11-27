
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";

export default function InvestorEmailVerification({ auth, onVerified }) {
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[view,setView]=useState("form"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[cooldown,setCooldown]=useState(0);
 const session=useRef(null),inFlight=useRef(false),finishTimer=useRef(null),mounted=useRef(true);
 useEffect(()=>()=>{mounted.current=false;clearTimeout(finishTimer.current)},[]);
 useEffect(()=>{if(cooldown<=0)return;const t=setTimeout(()=>setCooldown(c=>Math.max(0,c-1)),1000);return()=>clearTimeout(t)},[cooldown]);
 const complete=useCallback(user=>{if(!mounted.current||!session.current||user.uid!==session.current)return;session.current=null;setView("verified");finishTimer.current=setTimeout(()=>onVerified(user.email || ""),900)},[onVerified]);
 useEffect(()=>{
  if(view!=="verify")return;
  let cancelled=false;
  const poll=async()=>{
   const user=auth.currentUser;
   if(!user||!session.current||user.uid!==session.current||inFlight.current)return;
   inFlight.current=true;
   try{await user.reload();if(!cancelled&&auth.currentUser?.uid===user.uid&&auth.currentUser.emailVerified)complete(auth.currentUser)}
   catch(e){if(!cancelled&&mounted.current)setError(e?.message||"Could not check verification status.")}
   finally{inFlight.current=false}
  };
  const timer=setInterval(poll,3000);
  return()=>{cancelled=true;clearInterval(timer)};
 },[auth,view,complete]);
 async function register(e){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setNotice("");
  const entered=email.trim();
  try{
   let result;
   try{result=await createUserWithEmailAndPassword(auth,entered,password)}
   catch(e){if(e?.code!=="auth/email-already-in-use")throw e;result=await signInWithEmailAndPassword(auth,entered,password)}
   const user=result.user;
   if(user.emailVerified){session.current=user.uid;complete(user);return}
   session.current=user.uid;setEmail(entered);setView("verify");
   try{await sendEmailVerification(user);setNotice("Verification email sent! Check your Inbox & Spam folder.");setCooldown(30)}
   catch(e){setError(e?.message||"Could not send verification email. Please try again.")}
  }catch(e){setError(e?.message||"Unable to sign in or create your account.")}
  finally{if(mounted.current)setBusy(false)}
 }
 async function resend(){
  if(busy||cooldown)return;
  const user=auth.currentUser;
  if(!user||user.uid!==session.current){setError("Session expired. Please start over.");return}
  setBusy(true);setError("");setNotice("");
  try{await sendEmailVerification(user);setCooldown(30);setNotice("Verification email sent! Check your Inbox & Spam folder.")}
  catch(e){setError(e?.message||"Could not send verification email.")}
  finally{if(mounted.current)setBusy(false)}
 }
 async function reset(){
  setBusy(true);setError("");
  try{
   if(auth.currentUser&&!auth.currentUser.emailVerified)await signOut(auth);
   session.current=null;setView("form");setEmail("");setPassword("");setCooldown(0);setNotice("");setError("");
  }catch(e){setError(e?.message||"Could not sign out. Please try again.")}
  finally{if(mounted.current)setBusy(false)}
 }
 const button="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm disabled:opacity-50";
 return <div className="rounded-3xl border border-white/25 bg-white/95 p-8 shadow-2xl">
  <div className="mb-6"><h3 className="text-xl font-bold text-slate-900">1. Personal &amp; Account Credentials</h3><p className="mt-1 text-xs text-slate-500">Enter your email and password, then verify your email before continuing.</p></div>
  {view==="form" ? <form onSubmit={register} className="space-y-4">
   <label className="block text-sm font-medium text-slate-700" htmlFor="investor-auth-email">Contact Email</label>
   <input id="investor-auth-email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" placeholder="Enter your email address"/>
   <label className="block text-sm font-medium text-slate-700" htmlFor="investor-auth-password">Password</label>
   <input id="investor-auth-password" type="password" required minLength={6} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" placeholder="Enter your password"/>
   <button type="submit" disabled={busy} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Please wait…":"Continue — Verify Email"}</button>
  </form> : view==="verified" ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center font-semibold text-emerald-700">Email Verified! ✓</div> :
  <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-6 text-center">
   <div className="text-3xl text-orange-500" aria-hidden="true">✉</div><h3 className="text-lg font-bold text-slate-900">Verify your email</h3>
   <p className="text-sm text-slate-700">Check your Inbox &amp; Spam folder.</p><p className="break-all text-sm text-slate-600">Verification link for <strong>{email}</strong></p>
   <p className="text-xs text-slate-500">Waiting for email confirmation…</p>
   <button type="button" className={button} disabled={busy||cooldown>0} onClick={resend}>{busy?"Please wait…":cooldown>0?"Resend available in "+cooldown+"s":"Resend Verification Email"}</button>
   <div><button type="button" className="text-sm font-medium text-orange-700 underline" disabled={busy} onClick={reset}>Use a different email / Start over</button></div>
  </div>}
  {notice&&<p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
  {error&&<p role="alert" className="mt-4 break-words rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
 </div>;
}
