import {useEffect} from 'react';
import Layout from '@theme/Layout';

interface RedirectPageProps {
  url: string;
  title: string;
  message?: string;
}

export default function RedirectPage({ 
  url, 
  title, 
  message = "Redirecting..." 
}: RedirectPageProps) {
  useEffect(() => {
    window.location.href = url;
  }, [url]);

  return (
    <Layout title={title}>
      <div style={{padding: '2rem', textAlign: 'center'}}>
        <h1>{message}</h1>
        <p>
          If you're not redirected automatically, 
          <a href={url}> click here</a>.
        </p>
      </div>
    </Layout>
  );
}
