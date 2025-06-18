import React from 'react';
import Layout from '@theme/Layout';

export default function Hello() {
  return (
    <Layout title="About" description="Team Toobig | About">
        <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          fontSize: '20px',
        }}>
        <h1>About</h1>
        <p>
        Todo, write this page!
        </p>
        </div>
    </Layout>
  );
}
