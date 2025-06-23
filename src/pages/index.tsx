import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Terry from '@site/src/components/FloatingTerry';

import styles from './index.module.css';

export default function Home(): ReactNode {
  return (
    <Layout
      title={`Team Toobig`}
      // Description is used in the social card (emebed on discord, linkedin etc)
      description="Three days. One game. As many devs as we can possibly get.">
      <div className={styles.background} />
      <div className={styles.mainContainer}>
        <div className={styles.terryContainer}>
          <Terry/>
        </div>
        <div className={styles.infoContainer}>
          <header className={styles.heroContainer}>
            <Heading as="h1" className={styles.heroTitle}>Team Toobig</Heading>
            <p className={styles.heroSubtitle}>We're assembling the biggest game jam team in history.</p>
            <p className={styles.heroSubtitle}>Three days. One game. As many devs as we can possibly get.</p>
            <div className={styles.buttons}>
              <Link
                className={`button button--secondary button--lg ${styles.wideButton} ${styles.learnMoreButton}`}
                to="/about">
                Learn more
              </Link>
              <Link
                className={`button button--secondary button--lg ${styles.wideButton} ${styles.applyButton}`}
                to="/apply">
                Apply to join 🚀
              </Link>
            </div>
          </header>
        </div>
      </div>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.footerText}>
            Questions and inquiries: <a href="mailto:hello@teamtoobig.com" className={styles.footerEmail}>hello@teamtoobig.com</a>
          </p>
        </div>
      </footer>
    </Layout>
  );
}
