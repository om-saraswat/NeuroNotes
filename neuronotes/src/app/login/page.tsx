"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-black dark:to-slate-900 flex flex-col relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:32px_32px]"></div>
      
      {/* Floating geometric shapes */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-slate-200/30 to-slate-300/30 dark:from-slate-700/20 dark:to-slate-600/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-l from-slate-300/20 to-slate-200/20 dark:from-slate-600/15 dark:to-slate-700/15 rounded-full blur-2xl animate-pulse delay-1000"></div>
      
      <div className="flex-1 flex items-center justify-center relative z-10 p-6">
        {session ? (
          <Card className="w-full max-w-md backdrop-blur-sm bg-white/80 dark:bg-black/80 border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-black/5 dark:shadow-black/20">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white dark:text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-light text-slate-900 dark:text-white">Welcome Back</CardTitle>
              <p className="text-slate-500 dark:text-slate-400 text-sm">You&apos;re successfully signed in</p>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-center mb-6">
                <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">Signed in as</div>
                <div className="font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  {session.user?.email}
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => signOut()}
                className="w-full h-11 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-100 text-white dark:text-black hover:from-slate-800 hover:to-slate-700 dark:hover:from-slate-100 dark:hover:to-white transition-all duration-200 shadow-lg hover:shadow-xl border-0"
              >
                Sign out
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md backdrop-blur-sm bg-white/80 dark:bg-black/80 border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-black/5 dark:shadow-black/20">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-light text-slate-900 dark:text-white">Sign In</CardTitle>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Choose your preferred method</p>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => signIn("github")} 
                  className="w-full h-11 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-100 text-white dark:text-black hover:from-slate-800 hover:to-slate-700 dark:hover:from-slate-100 dark:hover:to-white transition-all duration-200 shadow-lg hover:shadow-xl border-0 group"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                  Continue with GitHub
                </Button>
                
                <Button
                  onClick={() => signIn("google")}
                  variant="outline"
                  className="w-full h-11 bg-white dark:bg-black border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-sm hover:shadow-md group"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  By signing in, you agree to our terms and privacy policy
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}