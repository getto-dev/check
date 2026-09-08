'use client';
import { createContext,useContext,useState,useCallback } from 'react';
import { cn } from '@/lib/utils';
type Kind='success'|'error'|'info'; const C=createContext({showToast:(_m:string,_k:Kind='info')=>{}}); export const useToast=()=>useContext(C);
export function ToastProvider({children}:{children:React.ReactNode}){const[toast,setToast]=useState<{message:string;kind:Kind}|null>(null);const showToast=useCallback((message:string,kind:Kind='info')=>{setToast({message,kind});setTimeout(()=>setToast(null),2800)},[]);return <C.Provider value={{showToast}}>{children}{toast&&<div className={cn('fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl',toast.kind==='error'?'bg-red-600 text-white':toast.kind==='success'?'bg-green-600 text-white':'bg-foreground text-background')} role="status">{toast.message}</div>}</C.Provider>}
