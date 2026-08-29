import Head from 'next/head';
import '../styles/globals.css';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export default function App({ Component, pageProps }) {
  const setHydrated = useAuthStore((state) => state.setHydrated);

  useEffect(() => {
    // Ensure hydration is flagged immediately after client mount
    setHydrated();
  }, [setHydrated]);

  return (
    <>
      <Head>
        <title>Agentflow_AI — Autonomous AI Operations Platform</title>
        <meta name="description" content="AI Operations Automation Platform with Visual Workflows and Multi-Agent Orchestration." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
