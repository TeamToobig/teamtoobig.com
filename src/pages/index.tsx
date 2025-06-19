import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Terry from '@site/src/components/FloatingTerry';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.heroContent}>
      <div className={styles.heroContainer}>
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
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
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Team Toobig`}
      description="Three days. One game. As many devs as we can possibly get.">
      <div className={styles.background} />
      <div className={styles.mainContainer}>
        <div className={styles.terryContainer}>
          <Terry/>
        </div>
        <div className={styles.infoContainer}>
          <HomepageHeader />
        </div>
      </div>
    </Layout>
  );
}
